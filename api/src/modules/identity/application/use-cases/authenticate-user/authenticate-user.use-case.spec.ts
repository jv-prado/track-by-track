import { AuthenticateUserUseCase } from './authenticate-user.use-case';
import { RegisterUserUseCase } from '../register-user/register-user.use-case';
import { InMemoryUserRepository } from '../test-support/in-memory-user.repository';
import { InMemoryRefreshTokenRepository } from '../test-support/in-memory-refresh-token.repository';
import { FakeHasher } from '../test-support/fake-hasher';
import { FakeTokenSigner } from '../test-support/fake-token-signer';
import { FakeConfigService } from '../test-support/fake-config.service';
import { RefreshTokenIssuer } from '../../services/refresh-token-issuer.service';
import { InvalidCredentialsError } from '../../../domain/errors/invalid-credentials.error';
import { MustResetPasswordError } from '../../../domain/errors/must-reset-password.error';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.vo';
import { UniqueEntityId } from '../../../../../shared/kernel/unique-entity-id';

describe('AuthenticateUserUseCase', () => {
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

    const useCase = new AuthenticateUserUseCase(
      users,
      refreshTokens,
      hasher,
      tokenSigner,
      refreshTokenIssuer,
    );
    return { useCase, refreshTokens, users };
  }

  it('autentica com credenciais corretas e emite tokens', async () => {
    const { useCase, refreshTokens } = await setup();

    const output = await useCase.execute({
      email: 'ana@example.com',
      password: 'senha1234',
    });

    expect(output.accessToken).toBeTruthy();
    expect(output.refreshToken).toBeTruthy();
    expect(output.user.email).toBe('ana@example.com');

    const stored = await refreshTokens.findByTokenHash(
      new RefreshTokenIssuer(new FakeConfigService()).hash(output.refreshToken),
    );
    expect(stored).not.toBeNull();
    expect(stored?.revokedAt).toBeNull();
  });

  it('rejeita senha incorreta', async () => {
    const { useCase } = await setup();

    await expect(
      useCase.execute({ email: 'ana@example.com', password: 'senhaErrada' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('rejeita e-mail desconhecido', async () => {
    const { useCase } = await setup();

    await expect(
      useCase.execute({ email: 'ninguem@example.com', password: 'senha1234' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('exige redefinição de senha para conta migrada sem passwordHash', async () => {
    const { useCase, users } = await setup();
    const legacyUser = User.reconstitute(
      {
        email: Email.create('pedro@example.com'),
        passwordHash: null,
        displayName: 'Pedro',
        mustResetPassword: true,
        legacyFirebaseUid: 'firebase-uid-123',
        createdAt: new Date(),
      },
      new UniqueEntityId(),
    );
    await users.save(legacyUser);

    await expect(
      useCase.execute({
        email: 'pedro@example.com',
        password: 'qualquerCoisa',
      }),
    ).rejects.toThrow(MustResetPasswordError);
  });
});
