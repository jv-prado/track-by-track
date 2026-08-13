import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import { discoveryKeys } from "@/queries/discovery/keys";
import { rankingsKeys } from "./keys";

export interface DeleteRankingInput {
  rankingId: string;
  albumId: string;
}

export function useDeleteRankingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ rankingId }: DeleteRankingInput) => {
      await http.delete(`/rankings/${rankingId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.setQueryData(rankingsKeys.byAlbum(variables.albumId), null);
      queryClient.invalidateQueries({ queryKey: discoveryKeys.all });
    },
  });
}
