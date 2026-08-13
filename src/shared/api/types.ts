/**
 * Tipos escritos à mão enquanto o pipeline de codegen do OpenAPI (seção 2.2 do
 * CLAUDE.md) não está configurado. Cobrem só os endpoints já consumidos pelo
 * frontend — ver pendência na Fase 8 do CLAUDE.md.
 */

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  mustResetPassword: boolean;
  createdAt: string;
}

export interface AuthUserSummary {
  id: string;
  email: string;
  displayName: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUserSummary;
}

export interface RegisterResponse {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  /** Cursor da próxima página (feed). `null` = fim da lista. */
  nextCursor?: string | null;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface FeedItem {
  id: string;
  userId: string;
  userDisplayName: string;
  userAvatarUrl?: string;
  albumId: string;
  albumName: string;
  albumArtist: string;
  albumImageUrl?: string;
  averageScore: number;
  ratedTracks: number;
  totalTracks: number;
  createdAt: string;
}

export interface TopAlbumItem {
  albumId: string;
  albumName: string;
  albumArtist: string;
  albumImageUrl?: string;
  averageScore: number;
  ratingsCount: number;
}

export interface AlbumSummary {
  spotifyId: string;
  name: string;
  artist: string;
  /** 640px — só onde a capa aparece grande. */
  imageUrl?: string;
  /** 300px — o que os grids devem usar (~1/4 dos bytes). */
  imageUrlSmall?: string;
  releaseDate?: string;
}

export interface AlbumTrack {
  spotifyId: string;
  name: string;
  durationMs: number;
  trackNumber: number;
}

export interface AlbumDetail extends AlbumSummary {
  tracks: AlbumTrack[];
}

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
  progress: { rated: number; total: number; ignored: number; percentage: number };
  review: { text?: string; favoriteTrackId?: string; worstTrackId?: string };
  isFirstCompletionBadgeActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AlbumReviewItem {
  rankingId: string;
  userId: string;
  userDisplayName: string;
  userAvatarUrl?: string;
  reviewText: string | null;
  averageScore: number;
  createdAt: string;
}

export interface TrackTally {
  trackId: string;
  trackName: string;
  percentage: number;
}

export interface AlbumStats {
  albumId: string;
  averageScore: number;
  ratingsCount: number;
  topFavoriteTracks: TrackTally[];
  topWorstTracks: TrackTally[];
}

export interface CommentView {
  id: string;
  rankingId: string;
  authorId: string;
  authorDisplayName: string;
  authorAvatarUrl?: string;
  text: string;
  createdAt: string;
  editedAt: string | null;
}
