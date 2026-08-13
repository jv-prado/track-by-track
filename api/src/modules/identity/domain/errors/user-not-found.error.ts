import { NotFoundError } from '../../../../shared/kernel/errors/not-found.error';

export class UserNotFoundError extends NotFoundError {
  readonly code = 'USER_NOT_FOUND';

  constructor() {
    super('Usuário não encontrado.');
  }
}
