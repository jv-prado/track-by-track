import { Inject, Injectable } from '@nestjs/common';
import {
  RANKING_REPOSITORY,
  type RankingRepository,
} from '../../domain/repositories/ranking.repository';

export interface RankingOwner {
  userId: string;
  albumId: string;
}

/**
 * Único ponto por onde outro módulo pergunta "de quem é este ranking?" — espelho
 * do `UserDirectoryService` do Identity. Existe porque Comments precisa saber a
 * quem notificar e não pode (nem deve) alcançar o agregado por conta própria.
 */
@Injectable()
export class RankingDirectoryService {
  constructor(
    @Inject(RANKING_REPOSITORY) private readonly rankings: RankingRepository,
  ) {}

  async getOwner(rankingId: string): Promise<RankingOwner | null> {
    const ranking = await this.rankings.findById(rankingId);
    if (!ranking) return null;
    return { userId: ranking.userId, albumId: ranking.albumId };
  }
}
