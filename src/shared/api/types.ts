import type { components } from "./schema";

/**
 * Aliases sobre o contrato gerado (`schema.d.ts`, produzido por `npm run api:types`
 * a partir de `api/openapi.json`). Nada aqui é escrito à mão: se um campo mudar
 * na API, o erro aparece no typecheck da web, não em runtime — que é o ponto da
 * seção 2.2 do CLAUDE.md. Para corrigir um tipo, mexa no schema Zod da API e
 * regenere; nunca edite `schema.d.ts` nem descreva o shape aqui.
 */
type Schemas = components["schemas"];

export type CurrentUser = Schemas["CurrentUserResponseDto"];
export type AuthUserSummary = Schemas["ProfileResponseDto"];
export type LoginResponse = Schemas["LoginResponseDto"];
export type RefreshResponse = Schemas["RefreshResponseDto"];
export type RegisterResponse = Schemas["RegisterResponseDto"];
export type MessageResponse = Schemas["MessageResponseDto"];

export type PaginationMeta = Schemas["FeedPageDto"]["meta"];

/** Envelope de lista paginada — o `meta` é o mesmo em todos os endpoints. */
export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export type FeedItem = Schemas["FeedPageDto"]["data"][number];
export type TopAlbumItem = Schemas["TopAlbumsPageDto"]["data"][number];
export type AlbumReviewItem = Schemas["AlbumReviewsPageDto"]["data"][number];
export type UserStats = Schemas["UserStatsDto"];
export type LastEditedAlbum = Schemas["LastEditedAlbumDto"];
export type AlbumPreview = Schemas["AlbumPreviewDto"];
export type AlbumStats = Schemas["AlbumStatsDto"];
export type TrackTally = Schemas["AlbumStatsDto"]["topFavoriteTracks"][number];

export type AlbumSummary = Schemas["AlbumSearchPageDto"]["data"][number];
export type NewReleaseAlbum = Schemas["NewReleasesPageDto"]["data"][number];
export type TopChartAlbum = Schemas["TopChartPageDto"]["data"][number];
export type AlbumDetail = Schemas["AlbumDetailDto"];
export type AlbumTrack = Schemas["AlbumDetailDto"]["tracks"][number];
export type TrackPreview = Schemas["TrackPreviewDto"];

export type BillboardChartAlbum = Schemas["BillboardChartPageDto"]["data"][number];
export type BillboardHistory = Schemas["BillboardHistoryDto"];
export type BillboardHistoryEntry = Schemas["BillboardHistoryDto"]["history"][number];

export type RankingView = Schemas["RankingViewDto"];
export type RankingEntryView = Schemas["RankingViewDto"]["entries"][number];

export type CommentView = Schemas["CommentViewDto"];

export type FollowStats = Schemas["FollowStatsDto"];
export type FollowUserItem = Schemas["FollowUsersPageDto"]["data"][number];
export type PublicUser = Schemas["UserSearchPageDto"]["data"][number];

export type NotificationView = Schemas["NotificationsPageDto"]["data"][number];
export type UnreadCount = Schemas["UnreadCountDto"];
