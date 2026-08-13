import { FakeCacheInvalidator } from '../../../../../shared/application/ports/fake-cache-invalidator';
import { UpdateProfileUseCase } from './update-profile.use-case';
import { RegisterUserUseCase } from '../register-user/register-user.use-case';
import { InMemoryUserRepository } from '../test-support/in-memory-user.repository';
import { FakeHasher } from '../test-support/fake-hasher';
import { UserNotFoundError } from '../../../domain/errors/user-not-found.error';

describe('UpdateProfileUseCase', () => {
  it('atualiza o displayName do usuário', async () => {
    const users = new InMemoryUserRepository();
    const registered = await new RegisterUserUseCase(
      users,
      new FakeHasher(),
    ).execute({
      email: 'ana@example.com',
      password: 'senha1234',
      displayName: 'Ana',
    });

    const output = await new UpdateProfileUseCase(
      users,
      new FakeCacheInvalidator(),
    ).execute({
      userId: registered.id,
      displayName: 'Ana Souza',
    });

    expect(output.displayName).toBe('Ana Souza');
    const persisted = await users.findById(registered.id);
    expect(persisted?.displayName).toBe('Ana Souza');
  });

  it('lança UserNotFoundError para usuário inexistente', async () => {
    const users = new InMemoryUserRepository();

    await expect(
      new UpdateProfileUseCase(users, new FakeCacheInvalidator()).execute({
        userId: 'id-que-nao-existe',
        displayName: 'Novo Nome',
      }),
    ).rejects.toThrow(UserNotFoundError);
  });
});
