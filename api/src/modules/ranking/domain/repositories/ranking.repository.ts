import { AlbumRanking } from '../entities/album-ranking.aggregate';

export const RANKING_REPOSITORY = Symbol('RankingRepository');

export interface RankingRepository {
  save(ranking: AlbumRanking): Promise<void>;
  findById(id: string): Promise<AlbumRanking | null>;
  findByUserAndAlbum(
    userId: string,
    albumId: string,
  ): Promise<AlbumRanking | null>;
  delete(id: string): Promise<void>;
}
