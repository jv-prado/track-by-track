import { useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { CommentView, Paginated } from "@/shared/api/types";
import { commentsKeys, type CommentsFilters } from "./keys";

export function useCommentsByRankingQuery(rankingId: string, filters: CommentsFilters) {
  return useQuery({
    queryKey: commentsKeys.byRanking(rankingId, filters),
    queryFn: async () => {
      const { data } = await http.get<Paginated<CommentView>>(
        `/rankings/${rankingId}/comments`,
        { params: filters },
      );
      return data;
    },
    enabled: rankingId.length > 0,
  });
}
