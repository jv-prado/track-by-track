// Porta 1:1 de src/queries/discovery/keys.ts (web).
export interface FeedFilters {
  page: number;
  perPage: number;
}

export type FeedScope = "global" | "following";

export type ProfileSort = "recent" | "score-desc" | "score-asc";

export interface ProfileFilters extends FeedFilters {
  search?: string;
  sort?: ProfileSort;
  genre?: string;
  completedOnly?: boolean;
}

export type ProfileInfiniteFilters = Pick<
  ProfileFilters,
  "search" | "sort" | "genre" | "completedOnly"
>;

export const discoveryKeys = {
  all: ["discovery"] as const,
  feed: (filters: FeedFilters) => [...discoveryKeys.all, "feed", filters] as const,
  feedInfinite: (scope: FeedScope = "global", genre?: string) =>
    [...discoveryKeys.all, "feed-infinite", scope, genre ?? "all"] as const,
  topAlbums: (filters: FeedFilters) => [...discoveryKeys.all, "top-albums", filters] as const,
  topAlbumsInfinite: (genre?: string) =>
    [...discoveryKeys.all, "top-albums-infinite", genre ?? "all"] as const,
  profile: (userId: string, filters: ProfileFilters) =>
    [...discoveryKeys.all, "profile", userId, filters] as const,
  profileInfinite: (userId: string, filters: ProfileInfiniteFilters) =>
    [...discoveryKeys.all, "profile-infinite", userId, filters] as const,
  usersStats: (userIds: readonly string[], completedOnly?: boolean) =>
    [...discoveryKeys.all, "users-stats", userIds, completedOnly ?? false] as const,
  profileStats: (userId: string, completedOnly?: boolean) =>
    [...discoveryKeys.all, "profile-stats", userId, completedOnly ?? false] as const,
  albumReviews: (albumId: string, filters: FeedFilters) =>
    [...discoveryKeys.all, "album-reviews", albumId, filters] as const,
  albumReviewsInfinite: (albumId: string) =>
    [...discoveryKeys.all, "album-reviews-infinite", albumId] as const,
  albumStats: (albumId: string) => [...discoveryKeys.all, "album-stats", albumId] as const,
  lastEditedAlbum: (userId: string) =>
    [...discoveryKeys.all, "last-edited-album", userId] as const,
};
