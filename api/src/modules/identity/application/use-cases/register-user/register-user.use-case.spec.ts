import { RegisterUserUseCase } from './register-user.use-case';
import { InMemoryUserRepository } from '../test-support/in-memory-user.repository';
import { FakeHasher } from '../test-support/fake-hasher';
import { EmailAlreadyTakenError } from '../../../domain/errors/email-already-taken.error';
import { WeakPasswordError } from '../../../domain/errors/weak-password.error';
import { InvalidEmailError } from '../../../domain/errors/invalid-email.error';

describe('RegisterUserUseCase', () => {
  function setup() {
    const users = new InMemoryUserRepository();
    const hasher = new FakeHasher();
    const useCase = new RegisterUserUseCase(users, hasher);
    return { users, hasher, useCase };
  }

  it('registra um novo usuário com sucesso', async () => {
    const { useCase } = setup();

    const output = await useCase.execute({
      email: 'Ana@Example.com',
      password: 'senha1234',
      displayName: 'Ana',
    });

    expect(output.email).toBe('ana@example.com');
    expect(output.displayName).toBe('Ana');
    expect(output.id).toBeTruthy();
    expect(output.createdAt).toBeTruthy();
  });

  it('rejeita e-mail já cadastrado', async () => {
    const { useCase } = setup();
    await useCase.execute({
      email: 'ana@example.com',
      password: 'senha1234',
      displayName: 'Ana',
    });

    await expect(
      useCase.execute({
        email: 'ana@example.com',
        password: 'outrasenha',
        displayName: 'Ana 2',
      }),
    ).rejects.toThrow(EmailAlreadyTakenError);
  });

  it('rejeita senha com menos de 8 caracteres', async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({
        email: 'ana@example.com',
        password: '1234567',
        displayName: 'Ana',
      }),
    ).rejects.toThrow(WeakPasswordError);
  });

  it('rejeita e-mail inválido', async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({
        email: 'não-é-email',
        password: 'senha1234',
        displayName: 'Ana',
      }),
    ).rejects.toThrow(InvalidEmailError);
  });
});
