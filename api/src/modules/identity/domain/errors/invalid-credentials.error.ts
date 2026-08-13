import { UnauthorizedError } from '../../../../shared/kernel/errors/unauthorized.error';

export class InvalidCredentialsError extends UnauthorizedError {
  readonly code = 'INVALID_CREDENTIALS';

  constructor() {
    super('E-mail ou senha inválidos.');
  }
}
