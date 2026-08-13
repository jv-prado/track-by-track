import { NotFoundError } from '../../../../shared/kernel/errors/not-found.error';

export class RankingNotFoundError extends NotFoundError {
  readonly code = 'RANKING_NOT_FOUND';

  constructor() {
    super('Ranking não encontrado.');
  }
}
