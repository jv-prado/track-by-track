import { Inject, Injectable } from '@nestjs/common';
import {
  RANKING_REPOSITORY,
  type RankingRepository,
} from '../../../domain/repositories/ranking.repository';
import { RankingNotFoundError } from '../../../domain/errors/ranking-not-found.error';
import { RankingForbiddenError } from '../../../domain/errors/ranking-forbidden.error';
import {
  CACHE_INVALIDATOR,
  type CacheInvalidator,
} from '../../../../../shared/application/ports/cache-invalidator.port';

export interface DeleteRankingInput {
  rankingId: string;
  requestingUserId: string;
}

@Injectable()
export class DeleteRankingUseCase {
  constructor(
    @Inject(RANKING_REPOSITORY) private readonly rankings: RankingRepository,
    @Inject(CACHE_INVALIDATOR)
    private readonly cacheInvalidator: CacheInvalidator,
  ) {}

  async execute(input: DeleteRankingInput): Promise<void> {
    const ranking = await this.rankings.findById(input.rankingId);
    if (!ranking) {
      throw new RankingNotFoundError();
    }
    if (ranking.userId !== input.requestingUserId) {
      throw new RankingForbiddenError();
    }

    await this.rankings.delete(input.rankingId);
    // Apagar sempre é mudança pública em potencial: se o ranking estava completo
    // ele desaparece do feed e da média do álbum na mesma hora.
    await this.cacheInvalidator.publicRankingsChanged(
      ranking.albumId,
      ranking.userId,
    );
  }
}
