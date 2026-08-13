import { ForbiddenError } from '../../../../shared/kernel/errors/forbidden.error';

export class RankingForbiddenError extends ForbiddenError {
  readonly code = 'RANKING_FORBIDDEN';

  constructor() {
    super('Você não pode alterar o ranking de outro usuário.');
  }
}
