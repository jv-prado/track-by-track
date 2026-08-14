import { ConflictError } from '../../../../shared/kernel/errors/conflict.error';

export class PasswordAlreadySetError extends ConflictError {
  readonly code = 'PASSWORD_ALREADY_SET';

  constructor() {
    super('Esta conta já possui senha definida. Use "esqueci minha senha".');
  }
}
