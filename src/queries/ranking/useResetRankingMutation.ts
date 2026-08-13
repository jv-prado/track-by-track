import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { RankingView } from "@/shared/api/types";
import { discoveryKeys } from "@/queries/discovery/keys";
import { rankingsKeys } from "./keys";

export interface ResetRankingInput {
  rankingId: string;
  albumId: string;
}

export function useResetRankingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ rankingId }: ResetRankingInput) => {
      const { data } = await http.post<RankingView>(`/rankings/${rankingId}/reset`);
      return data;
    },
    onSuccess: (ranking, variables) => {
      queryClient.setQueryData(rankingsKeys.byAlbum(variables.albumId), ranking);
      queryClient.invalidateQueries({ queryKey: discoveryKeys.all });
    },
  });
}
