import { Inject, Injectable } from '@nestjs/common';
import {
  RANKING_REPOSITORY,
  type RankingRepository,
} from '../../../domain/repositories/ranking.repository';
import { RankingNotFoundError } from '../../../domain/errors/ranking-not-found.error';
import { RankingForbiddenError } from '../../../domain/errors/ranking-forbidden.error';
import { RankingView, toRankingView } from '../../ranking-view';
import type { ReviewProps } from '../../../domain/entities/album-ranking.aggregate';
import {
  CACHE_INVALIDATOR,
  type CacheInvalidator,
} from '../../../../../shared/application/ports/cache-invalidator.port';
import { persistRanking } from '../../persist-ranking';

export interface SaveReviewInput {
  rankingId: string;
  requestingUserId: string;
  // undefined = campo não enviado, não mexe. null = enviado explicitamente pra limpar.
  text?: string | null;
  favoriteTrackId?: string | null;
  worstTrackId?: string | null;
}

@Injectable()
export class SaveReviewUseCase {
  constructor(
    @Inject(RANKING_REPOSITORY) private readonly rankings: RankingRepository,
    @Inject(CACHE_INVALIDATOR)
    private readonly cacheInvalidator: CacheInvalidator,
  ) {}

  async execute(input: SaveReviewInput): Promise<RankingView> {
    const ranking = await this.rankings.findById(input.rankingId);
    if (!ranking) {
      throw new RankingNotFoundError();
    }
    if (ranking.userId !== input.requestingUserId) {
      throw new RankingForbiddenError();
    }

    const wasComplete = ranking.completedAt !== null;
    // só entra no patch o que o cliente de fato mandou — preserva os outros campos da review.
    const patch: Partial<ReviewProps> = {};
    if (input.text !== undefined) patch.text = input.text ?? undefined;
    if (input.favoriteTrackId !== undefined)
      patch.favoriteTrackId = input.favoriteTrackId ?? undefined;
    if (input.worstTrackId !== undefined)
      patch.worstTrackId = input.worstTrackId ?? undefined;
    ranking.saveReview(patch);
    await persistRanking(
      this.rankings,
      this.cacheInvalidator,
      ranking,
      wasComplete,
    );

    return toRankingView(ranking);
  }
}
