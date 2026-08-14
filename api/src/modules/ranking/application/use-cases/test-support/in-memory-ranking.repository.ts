import { AlbumRanking } from '../../../domain/entities/album-ranking.aggregate';
import { RankingRepository } from '../../../domain/repositories/ranking.repository';
import { RankingAlreadyExistsError } from '../../../domain/errors/ranking-already-exists.error';

export class InMemoryRankingRepository implements RankingRepository {
  private readonly rankings = new Map<string, AlbumRanking>();

  /** Reproduz o índice único `(userId, albumId)` do schema — sem isso o teste
   * de criação concorrente passaria aqui e quebraria só em produção. */
  save(ranking: AlbumRanking): Promise<void> {
    const id = ranking.id.toString();
    for (const existing of this.rankings.values()) {
      if (
        existing.id.toString() !== id &&
        existing.userId === ranking.userId &&
        existing.albumId === ranking.albumId
      ) {
        return Promise.reject(new RankingAlreadyExistsError());
      }
    }
    this.rankings.set(id, ranking);
    return Promise.resolve();
  }

  findById(id: string): Promise<AlbumRanking | null> {
    return Promise.resolve(this.rankings.get(id) ?? null);
  }

  findByUserAndAlbum(
    userId: string,
    albumId: string,
  ): Promise<AlbumRanking | null> {
    for (const ranking of this.rankings.values()) {
      if (ranking.userId === userId && ranking.albumId === albumId) {
        return Promise.resolve(ranking);
      }
    }
    return Promise.resolve(null);
  }

  delete(id: string): Promise<void> {
    this.rankings.delete(id);
    return Promise.resolve();
  }
}
