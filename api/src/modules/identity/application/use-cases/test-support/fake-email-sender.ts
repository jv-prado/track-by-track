import { EmailSender } from '../../ports/email-sender.port';

export class FakeEmailSender implements EmailSender {
  readonly sentEmails: { to: string; resetUrl: string }[] = [];

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    await Promise.resolve();
    this.sentEmails.push({ to, resetUrl });
  }
}
