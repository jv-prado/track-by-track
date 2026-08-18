import { useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { FeedbackSummary, Paginated } from "@/shared/api/types";
import { feedbacksKeys, type FeedbacksFilters } from "./keys";

export function useFeedbacksQuery(filters: FeedbacksFilters) {
  return useQuery({
    queryKey: feedbacksKeys.list(filters),
    queryFn: async () => {
      const { data } = await http.get<Paginated<FeedbackSummary>>("/feedbacks", {
        params: {
          page: filters.page,
          perPage: filters.perPage,
          status: filters.status,
        },
      });
      return data;
    },
  });
}
