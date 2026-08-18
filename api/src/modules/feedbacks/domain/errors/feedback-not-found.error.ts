import { NotFoundError } from '../../../../shared/kernel/errors/not-found.error';

export class FeedbackNotFoundError extends NotFoundError {
  readonly code = 'FEEDBACK_NOT_FOUND';

  constructor() {
    super('Feedback não encontrado.');
  }
}
