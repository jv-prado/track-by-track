import { Injectable, Logger } from '@nestjs/common';
import { EmailSender } from '../../application/ports/email-sender.port';

/**
 * Adapter provisório enquanto nenhum provedor de e-mail transacional foi
 * escolhido (ver seção 4.4 do CLAUDE.md). Loga o link em vez de enviar
 * e-mail de verdade — trocar por Resend/SES/Postmark é só implementar
 * este mesmo `EmailSender` e trocar o provider no módulo.
 */
@Injectable()
export class ConsoleEmailSenderAdapter implements EmailSender {
  private readonly logger = new Logger(ConsoleEmailSenderAdapter.name);

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    await Promise.resolve();
    this.logger.warn(`[EMAIL] Reset de senha para ${to}: ${resetUrl}`);
  }
}
