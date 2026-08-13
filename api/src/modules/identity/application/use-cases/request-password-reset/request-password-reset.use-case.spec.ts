import { RequestPasswordResetUseCase } from './request-password-reset.use-case';
import { RegisterUserUseCase } from '../register-user/register-user.use-case';
import { InMemoryUserRepository } from '../test-support/in-memory-user.repository';
import { InMemoryPasswordResetTokenRepository } from '../test-support/in-memory-password-reset-token.repository';
import { FakeHasher } from '../test-support/fake-hasher';
import { FakeEmailSender } from '../test-support/fake-email-sender';
import { FakeConfigService } from '../test-support/fake-config.service';

describe('RequestPasswordResetUseCase', () => {
  async function setup() {
    const users = new InMemoryUserRepository();
    const resetTokens = new InMemoryPasswordResetTokenRepository();
    const emailSender = new FakeEmailSender();
    const hasher = new FakeHasher();

    await new RegisterUserUseCase(users, hasher).execute({
      email: 'ana@example.com',
      password: 'senha1234',
      displayName: 'Ana',
    });

    const useCase = new RequestPasswordResetUseCase(
      users,
      resetTokens,
      emailSender,
      new FakeConfigService(),
    );
    return { useCase, resetTokens, emailSender };
  }

  it('envia e-mail com link de reset quando o e-mail existe', async () => {
    const { useCase, emailSender } = await setup();

    const output = await useCase.execute({ email: 'ana@example.com' });

    expect(output.message).toContain('Se esse e-mail existir');
    expect(emailSender.sentEmails).toHaveLength(1);
    expect(emailSender.sentEmails[0]?.to).toBe('ana@example.com');
    expect(emailSender.sentEmails[0]?.resetUrl).toContain(
      '/redefinir-senha?token=',
    );
  });

  it('retorna a mesma mensagem genérica para e-mail inexistente, sem enviar e-mail', async () => {
    const { useCase, emailSender } = await setup();

    const output = await useCase.execute({ email: 'ninguem@example.com' });

    expect(output.message).toContain('Se esse e-mail existir');
    expect(emailSender.sentEmails).toHaveLength(0);
  });
});
