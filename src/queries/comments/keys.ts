export interface CommentsFilters {
  page: number;
  perPage: number;
}

export const commentsKeys = {
  all: ["comments"] as const,
  byRanking: (rankingId: string, filters: CommentsFilters) =>
    [...commentsKeys.all, "ranking", rankingId, filters] as const,
};
