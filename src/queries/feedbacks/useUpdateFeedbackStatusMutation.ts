import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { FeedbackDetail, FeedbackStatus } from "@/shared/api/types";
import { feedbacksKeys } from "./keys";

export interface UpdateFeedbackStatusInput {
  feedbackId: string;
  status: FeedbackStatus;
}

export function useUpdateFeedbackStatusMutation(feedbackId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateFeedbackStatusInput) => {
      const { data } = await http.patch<FeedbackDetail>(
        `/feedbacks/${input.feedbackId}/status`,
        { status: input.status },
      );
      return data;
    },
    onSuccess: (updatedFeedback, variables) => {
      const id = feedbackId ?? variables.feedbackId;
      queryClient.setQueryData(feedbacksKeys.detail(id), updatedFeedback);
      queryClient.invalidateQueries({ queryKey: feedbacksKeys.lists() });
      queryClient.invalidateQueries({ queryKey: feedbacksKeys.unansweredCount() });
    },
  });
}
