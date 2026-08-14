import type { components } from "./schema";

/**
 * Porta 1:1 de src/shared/api/types.ts (web) — mesmo contrato, mesmo
 * `schema.d.ts` gerado do `api/openapi.json` (npm run api:types). Nada aqui é
 * escrito à mão: pra corrigir um tipo, mexe no schema Zod da API e regenera.
 */
type Schemas = components["schemas"];

export type CurrentUser = Schemas["CurrentUserResponseDto"];
export type AuthUserSummary = Schemas["ProfileResponseDto"];
export type LoginResponse = Schemas["LoginResponseDto"];
export type RefreshResponse = Schemas["RefreshResponseDto"];
export type RegisterResponse = Schemas["RegisterResponseDto"];
export type MessageResponse = Schemas["MessageResponseDto"];

export type PaginationMeta = Schemas["FeedPageDto"]["meta"];

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export type FeedItem = Schemas["FeedPageDto"]["data"][number];
export type TopAlbumItem = Schemas["TopAlbumsPageDto"]["data"][number];
export type AlbumReviewItem = Schemas["AlbumReviewsPageDto"]["data"][number];
export type UserStats = Schemas["UserStatsDto"];
export type LastEditedAlbum = Schemas["LastEditedAlbumDto"];
export type AlbumStats = Schemas["AlbumStatsDto"];
export type TrackTally = Schemas["AlbumStatsDto"]["topFavoriteTracks"][number];

export type AlbumSummary = Schemas["AlbumSearchPageDto"]["data"][number];
export type NewReleaseAlbum = Schemas["NewReleasesPageDto"]["data"][number];
export type TopChartAlbum = Schemas["TopChartPageDto"]["data"][number];
export type AlbumDetail = Schemas["AlbumDetailDto"];
export type AlbumTrack = Schemas["AlbumDetailDto"]["tracks"][number];
export type TrackPreview = Schemas["TrackPreviewDto"];

export type RankingView = Schemas["RankingViewDto"];
export type RankingEntryView = Schemas["RankingViewDto"]["entries"][number];

export type CommentView = Schemas["CommentViewDto"];

export type FollowStats = Schemas["FollowStatsDto"];
export type FollowUserItem = Schemas["FollowUsersPageDto"]["data"][number];

export type NotificationView = Schemas["NotificationsPageDto"]["data"][number];
export type UnreadCount = Schemas["UnreadCountDto"];
