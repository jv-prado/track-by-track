import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { FeedbackDetail } from "@/shared/api/types";
import { feedbacksKeys } from "./keys";

export interface SendFeedbackMessageInput {
  feedbackId: string;
  message: string;
}

export function useSendFeedbackMessageMutation(feedbackId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SendFeedbackMessageInput) => {
      const { data } = await http.post<FeedbackDetail>(
        `/feedbacks/${input.feedbackId}/messages`,
        { message: input.message },
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
