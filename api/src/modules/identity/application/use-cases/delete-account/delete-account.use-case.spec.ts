import { FakeCacheInvalidator } from '../../../../../shared/application/ports/fake-cache-invalidator';
import { DeleteAccountUseCase } from './delete-account.use-case';
import { RegisterUserUseCase } from '../register-user/register-user.use-case';
import { AuthenticateUserUseCase } from '../authenticate-user/authenticate-user.use-case';
import { InMemoryUserRepository } from '../test-support/in-memory-user.repository';
import { InMemoryRefreshTokenRepository } from '../test-support/in-memory-refresh-token.repository';
import { FakeHasher } from '../test-support/fake-hasher';
import { FakeTokenSigner } from '../test-support/fake-token-signer';
import { FakeConfigService } from '../test-support/fake-config.service';
import { RefreshTokenIssuer } from '../../services/refresh-token-issuer.service';
import { InvalidCredentialsError } from '../../../domain/errors/invalid-credentials.error';
import { AccountCascadeDelete } from '../../ports/account-cascade-delete.port';

class FakeAccountCascadeDelete implements AccountCascadeDelete {
  deletedForUserIds: string[] = [];

  deleteAllForUser(userId: string): Promise<void> {
    this.deletedForUserIds.push(userId);
    return Promise.resolve();
  }
}

describe('DeleteAccountUseCase', () => {
  async function setup() {
    const users = new InMemoryUserRepository();
    const refreshTokens = new InMemoryRefreshTokenRepository();
    const hasher = new FakeHasher();
    const tokenSigner = new FakeTokenSigner();
    const refreshTokenIssuer = new RefreshTokenIssuer(new FakeConfigService());
    const cascadeDelete = new FakeAccountCascadeDelete();

    const registered = await new RegisterUserUseCase(users, hasher).execute({
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

    const useCase = new DeleteAccountUseCase(
      users,
      refreshTokens,
      hasher,
      cascadeDelete,
      new FakeCacheInvalidator(),
    );
    return {
      useCase,
      users,
      refreshTokens,
      cascadeDelete,
      registered,
      loginOutput,
      refreshTokenIssuer,
    };
  }

  it('apaga a conta, revoga sessões e faz cascade delete quando a senha está correta', async () => {
    const {
      useCase,
      users,
      refreshTokens,
      cascadeDelete,
      registered,
      loginOutput,
      refreshTokenIssuer,
    } = await setup();

    await useCase.execute({ userId: registered.id, password: 'senha1234' });

    expect(await users.findById(registered.id)).toBeNull();
    expect(cascadeDelete.deletedForUserIds).toContain(registered.id);

    const sessionHash = refreshTokenIssuer.hash(loginOutput.refreshToken);
    const sessionRecord = await refreshTokens.findByTokenHash(sessionHash);
    expect(sessionRecord?.revokedAt).not.toBeNull();
  });

  it('rejeita senha incorreta sem apagar nada', async () => {
    const { useCase, users, cascadeDelete, registered } = await setup();

    await expect(
      useCase.execute({ userId: registered.id, password: 'senhaErrada' }),
    ).rejects.toThrow(InvalidCredentialsError);

    expect(await users.findById(registered.id)).not.toBeNull();
    expect(cascadeDelete.deletedForUserIds).toHaveLength(0);
  });
});
