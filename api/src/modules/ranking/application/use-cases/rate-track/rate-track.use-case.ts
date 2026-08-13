import { Inject, Injectable } from '@nestjs/common';
import {
  RANKING_REPOSITORY,
  type RankingRepository,
} from '../../../domain/repositories/ranking.repository';
import { RankingNotFoundError } from '../../../domain/errors/ranking-not-found.error';
import { RankingForbiddenError } from '../../../domain/errors/ranking-forbidden.error';
import { Score } from '../../../domain/value-objects/score.vo';
import { RankingView, toRankingView } from '../../ranking-view';
import {
  CACHE_INVALIDATOR,
  type CacheInvalidator,
} from '../../../../../shared/application/ports/cache-invalidator.port';
import { invalidateRankingCache } from '../../invalidate-ranking-cache';

export interface RateTrackInput {
  rankingId: string;
  requestingUserId: string;
  trackId: string;
  score: number;
}

@Injectable()
export class RateTrackUseCase {
  constructor(
    @Inject(RANKING_REPOSITORY) private readonly rankings: RankingRepository,
    @Inject(CACHE_INVALIDATOR)
    private readonly cacheInvalidator: CacheInvalidator,
  ) {}

  async execute(input: RateTrackInput): Promise<RankingView> {
    const ranking = await this.rankings.findById(input.rankingId);
    if (!ranking) {
      throw new RankingNotFoundError();
    }
    if (ranking.userId !== input.requestingUserId) {
      throw new RankingForbiddenError();
    }

    const wasComplete = ranking.completedAt !== null;
    ranking.rateTrack(input.trackId, Score.create(input.score));
    await this.rankings.save(ranking);
    await invalidateRankingCache(this.cacheInvalidator, ranking, wasComplete);

    return toRankingView(ranking);
  }
}
