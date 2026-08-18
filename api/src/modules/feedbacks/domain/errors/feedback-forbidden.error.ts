import { ForbiddenError } from '../../../../shared/kernel/errors/forbidden.error';

export class FeedbackForbiddenError extends ForbiddenError {
  readonly code = 'FEEDBACK_FORBIDDEN';

  constructor(
    message = 'Você não tem permissão para acessar ou alterar este feedback.',
  ) {
    super(message);
  }
}
