import { NotFoundError } from '../../../shared/kernel/errors/not-found.error';

export class CommentNotFoundError extends NotFoundError {
  readonly code = 'COMMENT_NOT_FOUND';

  constructor() {
    super('Comentário não encontrado.');
  }
}
