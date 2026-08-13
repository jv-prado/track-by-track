import { LogoutUseCase } from './logout.use-case';
import { AuthenticateUserUseCase } from '../authenticate-user/authenticate-user.use-case';
import { RegisterUserUseCase } from '../register-user/register-user.use-case';
import { InMemoryUserRepository } from '../test-support/in-memory-user.repository';
import { InMemoryRefreshTokenRepository } from '../test-support/in-memory-refresh-token.repository';
import { FakeHasher } from '../test-support/fake-hasher';
import { FakeTokenSigner } from '../test-support/fake-token-signer';
import { FakeConfigService } from '../test-support/fake-config.service';
import { RefreshTokenIssuer } from '../../services/refresh-token-issuer.service';

describe('LogoutUseCase', () => {
  it('revoga a sessão associada ao refresh token apresentado', async () => {
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

    await new LogoutUseCase(refreshTokens, refreshTokenIssuer).execute({
      refreshToken: loginOutput.refreshToken,
    });

    const record = await refreshTokens.findByTokenHash(
      refreshTokenIssuer.hash(loginOutput.refreshToken),
    );
    expect(record?.revokedAt).not.toBeNull();
  });

  it('não lança erro ao receber um token desconhecido (logout é idempotente)', async () => {
    const refreshTokens = new InMemoryRefreshTokenRepository();
    const refreshTokenIssuer = new RefreshTokenIssuer(new FakeConfigService());

    await expect(
      new LogoutUseCase(refreshTokens, refreshTokenIssuer).execute({
        refreshToken: 'token-desconhecido',
      }),
    ).resolves.toBeUndefined();
  });
});
