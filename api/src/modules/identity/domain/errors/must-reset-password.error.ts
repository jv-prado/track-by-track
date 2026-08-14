import { ForbiddenError } from '../../../../shared/kernel/errors/forbidden.error';

export class MustResetPasswordError extends ForbiddenError {
  readonly code = 'MUST_RESET_PASSWORD';

  constructor() {
    super('Esta conta precisa redefinir a senha antes de entrar.');
  }
}
