import { useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { FeedbackDetail } from "@/shared/api/types";
import { feedbacksKeys } from "./keys";

export function useFeedbackDetailQuery(id: string | null | undefined) {
  return useQuery({
    queryKey: feedbacksKeys.detail(id ?? ""),
    queryFn: async () => {
      const { data } = await http.get<FeedbackDetail>(`/feedbacks/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}
