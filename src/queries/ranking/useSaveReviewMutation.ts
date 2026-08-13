import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { RankingView } from "@/shared/api/types";
import { discoveryKeys } from "@/queries/discovery/keys";
import { rankingsKeys } from "./keys";

export interface SaveReviewInput {
  rankingId: string;
  albumId: string;
  text?: string;
  favoriteTrackId?: string;
  worstTrackId?: string;
}

export function useSaveReviewMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ rankingId, ...body }: SaveReviewInput) => {
      const { data } = await http.patch<RankingView>(`/rankings/${rankingId}/review`, body);
      return data;
    },
    onSuccess: (ranking, variables) => {
      queryClient.setQueryData(rankingsKeys.byAlbum(variables.albumId), ranking);
      queryClient.invalidateQueries({ queryKey: discoveryKeys.all });
    },
  });
}
