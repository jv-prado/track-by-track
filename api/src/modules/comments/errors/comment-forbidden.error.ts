import { ForbiddenError } from '../../../shared/kernel/errors/forbidden.error';

export class CommentForbiddenError extends ForbiddenError {
  readonly code = 'COMMENT_FORBIDDEN';

  constructor() {
    super('Você não pode alterar o comentário de outro usuário.');
  }
}
