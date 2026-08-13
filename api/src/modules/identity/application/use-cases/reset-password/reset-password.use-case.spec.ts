import { createHash } from 'crypto';
import { ResetPasswordUseCase } from './reset-password.use-case';
import { AuthenticateUserUseCase } from '../authenticate-user/authenticate-user.use-case';
import { RegisterUserUseCase } from '../register-user/register-user.use-case';
import { InMemoryUserRepository } from '../test-support/in-memory-user.repository';
import { InMemoryPasswordResetTokenRepository } from '../test-support/in-memory-password-reset-token.repository';
import { InMemoryRefreshTokenRepository } from '../test-support/in-memory-refresh-token.repository';
import { FakeHasher } from '../test-support/fake-hasher';
import { FakeTokenSigner } from '../test-support/fake-token-signer';
import { FakeConfigService } from '../test-support/fake-config.service';
import { RefreshTokenIssuer } from '../../services/refresh-token-issuer.service';
import { InvalidResetTokenError } from '../../../domain/errors/invalid-reset-token.error';
import { WeakPasswordError } from '../../../domain/errors/weak-password.error';

const RAW_TOKEN = 'raw-reset-token-para-teste';
const TOKEN_HASH = createHash('sha256').update(RAW_TOKEN).digest('hex');

describe('ResetPasswordUseCase', () => {
  async function setup() {
    const users = new InMemoryUserRepository();
    const resetTokens = new InMemoryPasswordResetTokenRepository();
    const refreshTokens = new InMemoryRefreshTokenRepository();
    const hasher = new FakeHasher();
    const tokenSigner = new FakeTokenSigner();
    const refreshTokenIssuer = new RefreshTokenIssuer(new FakeConfigService());

    const registered = await new RegisterUserUseCase(users, hasher).execute({
      email: 'ana@example.com',
      password: 'senha1234',
      displayName: 'Ana',
    });

    // Sessão ativa antes do reset — deve ser revogada quando a senha mudar.
    const loginOutput = await new AuthenticateUserUseCase(
      users,
      refreshTokens,
      hasher,
      tokenSigner,
      refreshTokenIssuer,
    ).execute({ email: 'ana@example.com', password: 'senha1234' });

    const resetTokenRecord = await resetTokens.create({
      userId: registered.id,
      tokenHash: TOKEN_HASH,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const useCase = new ResetPasswordUseCase(
      users,
      resetTokens,
      refreshTokens,
      hasher,
    );
    return {
      useCase,
      users,
      resetTokens,
      refreshTokens,
      registered,
      resetTokenRecord,
      activeRefreshToken: loginOutput.refreshToken,
      refreshTokenIssuer,
    };
  }

  it('redefine a senha, marca o token como usado e revoga sessões ativas', async () => {
    const {
      useCase,
      users,
      resetTokens,
      refreshTokens,
      registered,
      resetTokenRecord,
      activeRefreshToken,
      refreshTokenIssuer,
    } = await setup();

    const output = await useCase.execute({
      token: RAW_TOKEN,
      newPassword: 'novaSenha456',
    });

    expect(output.message).toContain('sucesso');

    const user = await users.findById(registered.id);
    expect(
      await new FakeHasher().verify('novaSenha456', user!.passwordHash!.value),
    ).toBe(true);

    const usedRecord = await resetTokens.findByTokenHash(TOKEN_HASH);
    expect(usedRecord?.usedAt).not.toBeNull();
    expect(usedRecord?.id).toBe(resetTokenRecord.id);

    const sessionHash = refreshTokenIssuer.hash(activeRefreshToken);
    const sessionRecord = await refreshTokens.findByTokenHash(sessionHash);
    expect(sessionRecord?.revokedAt).not.toBeNull();
  });

  it('rejeita senha nova fraca', async () => {
    const { useCase } = await setup();

    await expect(
      useCase.execute({ token: RAW_TOKEN, newPassword: '123' }),
    ).rejects.toThrow(WeakPasswordError);
  });

  it('rejeita token desconhecido', async () => {
    const { useCase } = await setup();

    await expect(
      useCase.execute({ token: 'token-invalido', newPassword: 'novaSenha456' }),
    ).rejects.toThrow(InvalidResetTokenError);
  });

  it('rejeita token expirado', async () => {
    const { useCase, resetTokenRecord } = await setup();
    resetTokenRecord.expiresAt = new Date(Date.now() - 1000);

    await expect(
      useCase.execute({ token: RAW_TOKEN, newPassword: 'novaSenha456' }),
    ).rejects.toThrow(InvalidResetTokenError);
  });

  it('rejeita token já usado', async () => {
    const { useCase } = await setup();
    await useCase.execute({ token: RAW_TOKEN, newPassword: 'novaSenha456' });

    await expect(
      useCase.execute({ token: RAW_TOKEN, newPassword: 'outraSenha789' }),
    ).rejects.toThrow(InvalidResetTokenError);
  });
});
