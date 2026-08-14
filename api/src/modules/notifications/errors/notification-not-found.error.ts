import { NotFoundError } from '../../../shared/kernel/errors/not-found.error';

export class NotificationNotFoundError extends NotFoundError {
  readonly code = 'NOTIFICATION_NOT_FOUND';

  constructor() {
    super('Notificação não encontrada.');
  }
}
