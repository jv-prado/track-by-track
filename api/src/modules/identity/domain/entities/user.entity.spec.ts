import { User } from './user.entity';
import { Email } from '../value-objects/email.vo';
import { PasswordHash } from '../value-objects/password-hash.vo';
import { UniqueEntityId } from '../../../../shared/kernel/unique-entity-id';

describe('User', () => {
  it('cria um usuário novo com mustResetPassword false e emite UserRegisteredEvent', () => {
    const user = User.create({
      email: Email.create('ana@example.com'),
      passwordHash: PasswordHash.fromHash('hashed:senha1234'),
      displayName: 'Ana',
    });

    expect(user.mustResetPassword).toBe(false);
    const events = user.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.constructor.name).toBe('UserRegisteredEvent');
  });

  it('pullDomainEvents esvazia a fila de eventos após a leitura', () => {
    const user = User.create({
      email: Email.create('ana@example.com'),
      passwordHash: PasswordHash.fromHash('hashed:senha1234'),
      displayName: 'Ana',
    });

    user.pullDomainEvents();
    expect(user.pullDomainEvents()).toHaveLength(0);
  });

  it('changePassword troca o hash e limpa mustResetPassword', () => {
    const user = User.reconstitute(
      {
        email: Email.create('ana@example.com'),
        passwordHash: null,
        displayName: 'Ana',
        mustResetPassword: true,
        createdAt: new Date(),
        role: 'user',
      },
      new UniqueEntityId(),
    );

    user.changePassword(PasswordHash.fromHash('hashed:novaSenha'));

    expect(user.mustResetPassword).toBe(false);
    expect(user.passwordHash?.value).toBe('hashed:novaSenha');
  });
});
