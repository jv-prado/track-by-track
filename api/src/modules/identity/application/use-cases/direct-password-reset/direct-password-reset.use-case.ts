import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../domain/repositories/user.repository';
import { InvalidCredentialsError } from '../../../domain/errors/invalid-credentials.error';
import { PasswordAlreadySetError } from '../../../domain/errors/password-already-set.error';
import { WeakPasswordError } from '../../../domain/errors/weak-password.error';
import { PasswordHash } from '../../../domain/value-objects/password-hash.vo';
import { HASHER, type Hasher } from '../../ports/hasher.port';
import {
  DirectPasswordResetInput,
  DirectPasswordResetOutput,
} from './direct-password-reset.input';

const MIN_PASSWORD_LENGTH = 8;

/**
 * Define a senha sem token de e-mail — só existe porque nenhum provedor de
 * e-mail transacional foi escolhido ainda (ver 4.4 do CLAUDE.md). Só funciona
 * para contas migradas que nunca tiveram `passwordHash`; uma vez definida, a
 * senha, esta rota fecha sozinha para essa conta (deixa de haver `null` para
 * checar). Trocar por RequestPasswordReset/ResetPassword (com token) quando o
 * provedor de e-mail for escolhido.
 */
@Injectable()
export class DirectPasswordResetUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(HASHER) private readonly hasher: Hasher,
  ) {}

  async execute(
    input: DirectPasswordResetInput,
  ): Promise<DirectPasswordResetOutput> {
    if (input.newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new WeakPasswordError();
    }

    const user = await this.users.findByEmail(input.email.trim().toLowerCase());
    if (!user) {
      throw new InvalidCredentialsError();
    }

    if (user.passwordHash) {
      throw new PasswordAlreadySetError();
    }

    const hash = await this.hasher.hash(input.newPassword);
    user.changePassword(PasswordHash.fromHash(hash));
    await this.users.save(user);

    return { message: 'Senha definida com sucesso.' };
  }
}
