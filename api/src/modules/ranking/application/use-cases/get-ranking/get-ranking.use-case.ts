import { Inject, Injectable } from '@nestjs/common';
import {
  RANKING_REPOSITORY,
  type RankingRepository,
} from '../../../domain/repositories/ranking.repository';
import { RankingNotFoundError } from '../../../domain/errors/ranking-not-found.error';
import { RankingView, toRankingView } from '../../ranking-view';

@Injectable()
export class GetRankingUseCase {
  constructor(
    @Inject(RANKING_REPOSITORY) private readonly rankings: RankingRepository,
  ) {}

  async byId(rankingId: string): Promise<RankingView> {
    const ranking = await this.rankings.findById(rankingId);
    if (!ranking) {
      throw new RankingNotFoundError();
    }
    return toRankingView(ranking);
  }

  async byUserAndAlbum(userId: string, albumId: string): Promise<RankingView> {
    const ranking = await this.rankings.findByUserAndAlbum(userId, albumId);
    if (!ranking) {
      throw new RankingNotFoundError();
    }
    return toRankingView(ranking);
  }
}
