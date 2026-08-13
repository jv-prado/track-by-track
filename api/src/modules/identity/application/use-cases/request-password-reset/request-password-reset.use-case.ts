import { randomBytes, createHash } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../domain/repositories/user.repository';
import {
  PASSWORD_RESET_TOKEN_REPOSITORY,
  type PasswordResetTokenRepository,
} from '../../../domain/repositories/password-reset-token.repository';
import { EMAIL_SENDER, type EmailSender } from '../../ports/email-sender.port';
import {
  RequestPasswordResetInput,
  RequestPasswordResetOutput,
} from './request-password-reset.input';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const GENERIC_MESSAGE =
  'Se esse e-mail existir, enviamos um link de redefinição de senha.';

/** Único ponto de config que este use case precisa — permite fake simples nos testes. */
export interface WebOriginConfig {
  get(key: 'WEB_ORIGIN'): string;
}

@Injectable()
export class RequestPasswordResetUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY)
    private readonly resetTokens: PasswordResetTokenRepository,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
    @Inject(ConfigService) private readonly config: WebOriginConfig,
  ) {}

  async execute(
    input: RequestPasswordResetInput,
  ): Promise<RequestPasswordResetOutput> {
    const user = await this.users.findByEmail(input.email.trim().toLowerCase());

    // Nunca revela se o e-mail existe — mesma resposta nos dois casos.
    if (user) {
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');

      await this.resetTokens.create({
        userId: user.id.toString(),
        tokenHash,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      });

      const webOrigin = this.config.get('WEB_ORIGIN');
      const resetUrl = `${webOrigin}/redefinir-senha?token=${rawToken}`;
      await this.emailSender.sendPasswordResetEmail(user.email.value, resetUrl);
    }

    return { message: GENERIC_MESSAGE };
  }
}
