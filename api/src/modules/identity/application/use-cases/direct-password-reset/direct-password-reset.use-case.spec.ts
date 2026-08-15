import { DirectPasswordResetUseCase } from './direct-password-reset.use-case';
import { RegisterUserUseCase } from '../register-user/register-user.use-case';
import { InMemoryUserRepository } from '../test-support/in-memory-user.repository';
import { FakeHasher } from '../test-support/fake-hasher';
import { InvalidCredentialsError } from '../../../domain/errors/invalid-credentials.error';
import { PasswordAlreadySetError } from '../../../domain/errors/password-already-set.error';
import { WeakPasswordError } from '../../../domain/errors/weak-password.error';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.vo';
import { UniqueEntityId } from '../../../../../shared/kernel/unique-entity-id';

describe('DirectPasswordResetUseCase', () => {
  async function setup() {
    const users = new InMemoryUserRepository();
    const hasher = new FakeHasher();
    const useCase = new DirectPasswordResetUseCase(users, hasher);

    const legacyUser = User.reconstitute(
      {
        email: Email.create('pedro@example.com'),
        passwordHash: null,
        displayName: 'Pedro',
        mustResetPassword: true,
        legacyFirebaseUid: 'firebase-uid-123',
        createdAt: new Date(),
        role: 'user',
      },
      new UniqueEntityId(),
    );
    await users.save(legacyUser);

    return { useCase, users, hasher, legacyUser };
  }

  it('define a senha e limpa mustResetPassword para conta migrada', async () => {
    const { useCase, users, hasher, legacyUser } = await setup();

    const output = await useCase.execute({
      email: 'pedro@example.com',
      newPassword: 'novaSenha456',
    });

    expect(output.message).toContain('sucesso');

    const user = await users.findById(legacyUser.id.toString());
    expect(user!.mustResetPassword).toBe(false);
    expect(await hasher.verify('novaSenha456', user!.passwordHash!.value)).toBe(
      true,
    );
  });

  it('rejeita senha fraca', async () => {
    const { useCase } = await setup();

    await expect(
      useCase.execute({ email: 'pedro@example.com', newPassword: '123' }),
    ).rejects.toThrow(WeakPasswordError);
  });

  it('rejeita e-mail desconhecido', async () => {
    const { useCase } = await setup();

    await expect(
      useCase.execute({
        email: 'ninguem@example.com',
        newPassword: 'novaSenha456',
      }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('rejeita conta que já tem senha definida', async () => {
    const { useCase, users, hasher } = await setup();
    await new RegisterUserUseCase(users, hasher).execute({
      email: 'ana@example.com',
      password: 'senha1234',
      displayName: 'Ana',
    });

    await expect(
      useCase.execute({
        email: 'ana@example.com',
        newPassword: 'novaSenha456',
      }),
    ).rejects.toThrow(PasswordAlreadySetError);
  });
});
