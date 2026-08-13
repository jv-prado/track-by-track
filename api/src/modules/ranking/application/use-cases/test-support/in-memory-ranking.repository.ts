import { AlbumRanking } from '../../../domain/entities/album-ranking.aggregate';
import { RankingRepository } from '../../../domain/repositories/ranking.repository';

export class InMemoryRankingRepository implements RankingRepository {
  private readonly rankings = new Map<string, AlbumRanking>();

  save(ranking: AlbumRanking): Promise<void> {
    this.rankings.set(ranking.id.toString(), ranking);
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
