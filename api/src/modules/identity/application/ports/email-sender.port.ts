export const EMAIL_SENDER = Symbol('EmailSender');

export interface EmailSender {
  sendPasswordResetEmail(to: string, resetUrl: string): Promise<void>;
}
