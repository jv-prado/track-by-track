import { RefreshTokenUseCase } from './refresh-token.use-case';
import { AuthenticateUserUseCase } from '../authenticate-user/authenticate-user.use-case';
import { RegisterUserUseCase } from '../register-user/register-user.use-case';
import { InMemoryUserRepository } from '../test-support/in-memory-user.repository';
import { InMemoryRefreshTokenRepository } from '../test-support/in-memory-refresh-token.repository';
import { FakeHasher } from '../test-support/fake-hasher';
import { FakeTokenSigner } from '../test-support/fake-token-signer';
import { FakeConfigService } from '../test-support/fake-config.service';
import { RefreshTokenIssuer } from '../../services/refresh-token-issuer.service';
import { InvalidRefreshTokenError } from '../../../domain/errors/invalid-refresh-token.error';

describe('RefreshTokenUseCase', () => {
  async function setup() {
    const users = new InMemoryUserRepository();
    const refreshTokens = new InMemoryRefreshTokenRepository();
    const hasher = new FakeHasher();
    const tokenSigner = new FakeTokenSigner();
    const refreshTokenIssuer = new RefreshTokenIssuer(new FakeConfigService());

    await new RegisterUserUseCase(users, hasher).execute({
      email: 'ana@example.com',
      password: 'senha1234',
      displayName: 'Ana',
    });
    const loginOutput = await new AuthenticateUserUseCase(
      users,
      refreshTokens,
      hasher,
      tokenSigner,
      refreshTokenIssuer,
    ).execute({ email: 'ana@example.com', password: 'senha1234' });

    const useCase = new RefreshTokenUseCase(
      users,
      refreshTokens,
      tokenSigner,
      refreshTokenIssuer,
    );
    return {
      useCase,
      refreshTokens,
      initialRefreshToken: loginOutput.refreshToken,
    };
  }

  it('rotaciona um refresh token válido e invalida o anterior', async () => {
    const { useCase, refreshTokens, initialRefreshToken } = await setup();

    const output = await useCase.execute({ refreshToken: initialRefreshToken });

    expect(output.refreshToken).not.toBe(initialRefreshToken);
    expect(output.accessToken).toBeTruthy();

    const oldHash = new RefreshTokenIssuer(new FakeConfigService()).hash(
      initialRefreshToken,
    );
    const oldRecord = await refreshTokens.findByTokenHash(oldHash);
    expect(oldRecord?.replacedByTokenHash).not.toBeNull();
  });

  it('rejeita token desconhecido', async () => {
    const { useCase } = await setup();

    await expect(
      useCase.execute({ refreshToken: 'token-que-nao-existe' }),
    ).rejects.toThrow(InvalidRefreshTokenError);
  });

  it('detecta reuso de token já rotacionado e revoga a família inteira', async () => {
    const { useCase, initialRefreshToken } = await setup();

    const firstRotation = await useCase.execute({
      refreshToken: initialRefreshToken,
    });

    // Reapresentar o token antigo (já rotacionado) é reuso — deve falhar.
    await expect(
      useCase.execute({ refreshToken: initialRefreshToken }),
    ).rejects.toThrow(InvalidRefreshTokenError);

    // A família inteira foi revogada, então até o token novo (válido) para de funcionar.
    await expect(
      useCase.execute({ refreshToken: firstRotation.refreshToken }),
    ).rejects.toThrow(InvalidRefreshTokenError);
  });

  it('sob uso concorrente do mesmo token, só uma rotação vence e a família é revogada', async () => {
    const { useCase, refreshTokens, initialRefreshToken } = await setup();

    // Token roubado usado no mesmo instante que o cliente legítimo (ou retry de
    // rede duplicado): as duas leem o registro ativo antes de qualquer escrita.
    const results = await Promise.allSettled([
      useCase.execute({ refreshToken: initialRefreshToken }),
      useCase.execute({ refreshToken: initialRefreshToken }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      InvalidRefreshTokenError,
    );

    // Perder a corrida é tratado como reuso: a família inteira cai, então nem o
    // refresh recém-emitido pelo vencedor continua valendo.
    const winner = (
      fulfilled[0] as PromiseFulfilledResult<{ refreshToken: string }>
    ).value;
    await expect(
      useCase.execute({ refreshToken: winner.refreshToken }),
    ).rejects.toThrow(InvalidRefreshTokenError);

    const issuer = new RefreshTokenIssuer(new FakeConfigService());
    const original = await refreshTokens.findByTokenHash(
      issuer.hash(initialRefreshToken),
    );
    expect(original?.revokedAt).not.toBeNull();
  });

  it('rejeita token expirado', async () => {
    const { useCase, refreshTokens, initialRefreshToken } = await setup();
    const hash = new RefreshTokenIssuer(new FakeConfigService()).hash(
      initialRefreshToken,
    );
    const record = await refreshTokens.findByTokenHash(hash);
    if (record) {
      record.expiresAt = new Date(Date.now() - 1000);
    }

    await expect(
      useCase.execute({ refreshToken: initialRefreshToken }),
    ).rejects.toThrow(InvalidRefreshTokenError);
  });
});
