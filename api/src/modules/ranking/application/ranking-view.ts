import { AlbumRanking } from '../domain/entities/album-ranking.aggregate';

export interface RankingEntryView {
  trackId: string;
  score: number;
  position: number;
  ignored: boolean;
}

export interface RankingView {
  id: string;
  userId: string;
  albumId: string;
  entries: RankingEntryView[];
  averageScore: number;
  progress: {
    rated: number;
    total: number;
    ignored: number;
    percentage: number;
  };
  review: { text?: string; favoriteTrackId?: string; worstTrackId?: string };
  isFirstCompletionBadgeActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toRankingView(ranking: AlbumRanking): RankingView {
  return {
    id: ranking.id.toString(),
    userId: ranking.userId,
    albumId: ranking.albumId,
    entries: ranking.entries
      .map((entry) => ({
        trackId: entry.trackId,
        score: entry.score.value,
        position: entry.position.value,
        ignored: entry.ignored,
      }))
      .sort((a, b) => a.position - b.position),
    averageScore: ranking.averageScore,
    progress: ranking.progress,
    review: ranking.review,
    isFirstCompletionBadgeActive: ranking.isFirstCompletionBadgeActive,
    createdAt: ranking.createdAt.toISOString(),
    updatedAt: ranking.updatedAt.toISOString(),
  };
}
