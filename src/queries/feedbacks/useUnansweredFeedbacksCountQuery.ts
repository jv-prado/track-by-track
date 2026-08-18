import { useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { UnansweredFeedbacksCount } from "@/shared/api/types";
import { feedbacksKeys } from "./keys";

export function useUnansweredFeedbacksCountQuery(enabled = true) {
  return useQuery({
    queryKey: feedbacksKeys.unansweredCount(),
    queryFn: async () => {
      const { data } = await http.get<UnansweredFeedbacksCount>("/feedbacks/unanswered-count");
      return data.count;
    },
    enabled,
    staleTime: 60_000,
  });
}
