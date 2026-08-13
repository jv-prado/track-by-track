import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import { commentsKeys } from "./keys";

export function useDeleteCommentMutation(rankingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      await http.delete(`/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...commentsKeys.all, "ranking", rankingId] });
    },
  });
}
