import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { FeedbackDetail } from "@/shared/api/types";
import { feedbacksKeys } from "./keys";

export interface CreateFeedbackInput {
  subject: string;
  message: string;
}

export function useCreateFeedbackMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateFeedbackInput) => {
      const { data } = await http.post<FeedbackDetail>("/feedbacks", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedbacksKeys.all });
    },
  });
}
