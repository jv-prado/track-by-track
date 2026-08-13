import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { CommentView } from "@/shared/api/types";
import { commentsKeys } from "./keys";

export function useUpdateCommentMutation(rankingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, text }: { commentId: string; text: string }) => {
      const { data } = await http.patch<CommentView>(`/comments/${commentId}`, { text });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...commentsKeys.all, "ranking", rankingId] });
    },
  });
}
