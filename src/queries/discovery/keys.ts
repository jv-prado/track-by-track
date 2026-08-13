export interface FeedFilters {
  page: number;
  perPage: number;
}

export type ProfileSort = "recent" | "score-desc" | "score-asc";

export interface ProfileFilters extends FeedFilters {
  search?: string;
  sort?: ProfileSort;
}

export type ProfileInfiniteFilters = Pick<ProfileFilters, "search" | "sort">;

export const discoveryKeys = {
  all: ["discovery"] as const,
  feed: (filters: FeedFilters) => [...discoveryKeys.all, "feed", filters] as const,
  feedInfinite: () => [...discoveryKeys.all, "feed-infinite"] as const,
  topAlbums: (filters: FeedFilters) => [...discoveryKeys.all, "top-albums", filters] as const,
  topAlbumsInfinite: () => [...discoveryKeys.all, "top-albums-infinite"] as const,
  profile: (userId: string, filters: ProfileFilters) =>
    [...discoveryKeys.all, "profile", userId, filters] as const,
  profileInfinite: (userId: string, filters: ProfileInfiniteFilters) =>
    [...discoveryKeys.all, "profile-infinite", userId, filters] as const,
  profileStats: (userId: string) => [...discoveryKeys.all, "profile-stats", userId] as const,
  albumReviews: (albumId: string, filters: FeedFilters) =>
    [...discoveryKeys.all, "album-reviews", albumId, filters] as const,
  albumReviewsInfinite: (albumId: string) =>
    [...discoveryKeys.all, "album-reviews-infinite", albumId] as const,
  albumStats: (albumId: string) => [...discoveryKeys.all, "album-stats", albumId] as const,
};
