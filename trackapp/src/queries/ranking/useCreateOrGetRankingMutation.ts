import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { RankingView } from "@/shared/api/types";
import { discoveryKeys } from "@/queries/discovery/keys";
import { rankingsKeys } from "./keys";

export function useCreateOrGetRankingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (albumId: string) => {
      const { data } = await http.post<RankingView>("/rankings", { albumId });
      return data;
    },
    onSuccess: (ranking) => {
      queryClient.setQueryData(rankingsKeys.byAlbum(ranking.albumId), ranking);
      queryClient.invalidateQueries({ queryKey: discoveryKeys.all });
    },
  });
}
