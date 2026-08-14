import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { CommentView } from "@/shared/api/types";
import { commentsKeys } from "./keys";

export function useCreateCommentMutation(rankingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => {
      const { data } = await http.post<CommentView>(`/rankings/${rankingId}/comments`, { text });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...commentsKeys.all, "ranking", rankingId] });
    },
  });
}
