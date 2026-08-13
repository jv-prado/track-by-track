import { createHash } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../domain/repositories/user.repository';
import {
  PASSWORD_RESET_TOKEN_REPOSITORY,
  type PasswordResetTokenRepository,
} from '../../../domain/repositories/password-reset-token.repository';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../../domain/repositories/refresh-token.repository';
import { InvalidResetTokenError } from '../../../domain/errors/invalid-reset-token.error';
import { WeakPasswordError } from '../../../domain/errors/weak-password.error';
import { PasswordHash } from '../../../domain/value-objects/password-hash.vo';
import { HASHER, type Hasher } from '../../ports/hasher.port';
import {
  ResetPasswordInput,
  ResetPasswordOutput,
} from './reset-password.input';

const MIN_PASSWORD_LENGTH = 8;

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY)
    private readonly resetTokens: PasswordResetTokenRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
    @Inject(HASHER) private readonly hasher: Hasher,
  ) {}

  async execute(input: ResetPasswordInput): Promise<ResetPasswordOutput> {
    if (input.newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new WeakPasswordError();
    }

    const tokenHash = createHash('sha256').update(input.token).digest('hex');
    const record = await this.resetTokens.findByTokenHash(tokenHash);

    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw new InvalidResetTokenError();
    }

    const user = await this.users.findById(record.userId);
    if (!user) {
      throw new InvalidResetTokenError();
    }

    const hash = await this.hasher.hash(input.newPassword);
    user.changePassword(PasswordHash.fromHash(hash));

    await this.users.save(user);
    await this.resetTokens.markUsed(record.id);
    // Trocar a senha revoga todas as sessões ativas — força novo login em todo lugar.
    await this.refreshTokens.revokeAllForUser(record.userId);

    return { message: 'Senha redefinida com sucesso.' };
  }
}
