import { UnauthorizedError } from '../../../../shared/kernel/errors/unauthorized.error';

export class InvalidRefreshTokenError extends UnauthorizedError {
  readonly code = 'INVALID_REFRESH_TOKEN';

  constructor() {
    super('Sessão expirada. Faça login novamente.');
  }
}
