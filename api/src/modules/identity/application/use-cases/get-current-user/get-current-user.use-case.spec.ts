import { GetCurrentUserUseCase } from './get-current-user.use-case';
import { RegisterUserUseCase } from '../register-user/register-user.use-case';
import { InMemoryUserRepository } from '../test-support/in-memory-user.repository';
import { FakeHasher } from '../test-support/fake-hasher';
import { UserNotFoundError } from '../../../domain/errors/user-not-found.error';

describe('GetCurrentUserUseCase', () => {
  it('retorna os dados do usuário autenticado', async () => {
    const users = new InMemoryUserRepository();
    const registered = await new RegisterUserUseCase(
      users,
      new FakeHasher(),
    ).execute({
      email: 'ana@example.com',
      password: 'senha1234',
      displayName: 'Ana',
    });

    const output = await new GetCurrentUserUseCase(users).execute({
      userId: registered.id,
    });

    expect(output.email).toBe('ana@example.com');
    expect(output.mustResetPassword).toBe(false);
  });

  it('lança UserNotFoundError para id inexistente', async () => {
    const users = new InMemoryUserRepository();

    await expect(
      new GetCurrentUserUseCase(users).execute({ userId: 'id-que-nao-existe' }),
    ).rejects.toThrow(UserNotFoundError);
  });
});
