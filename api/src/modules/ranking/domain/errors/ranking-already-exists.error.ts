import { ConflictError } from '../../../../shared/kernel/errors/conflict.error';

/**
 * Já existe ranking para o par (userId, albumId). Sinaliza que outra requisição
 * concorrente criou o ranking primeiro — o chamador deve reler e usar o
 * existente, não propagar erro pro usuário (ver create-or-get-ranking).
 */
export class RankingAlreadyExistsError extends ConflictError {
  readonly code = 'RANKING_ALREADY_EXISTS';

  constructor() {
    super('Já existe um ranking deste usuário para este álbum.');
  }
}
