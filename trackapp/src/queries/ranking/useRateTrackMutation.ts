import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { RankingView } from "@/shared/api/types";
import { discoveryKeys } from "@/queries/discovery/keys";
import { rankingsKeys } from "./keys";

export interface RateTrackInput {
  rankingId: string;
  trackId: string;
  score: number;
  albumId: string;
}

interface RateTrackContext {
  previous?: RankingView;
}

// Porta 1:1 de src/queries/ranking/useRateTrackMutation.ts (web) — update
// otimista + guarda contra resposta fora de ordem, mesma lógica exata.
export function useRateTrackMutation() {
  const queryClient = useQueryClient();

  return useMutation<RankingView, unknown, RateTrackInput, RateTrackContext>({
    mutationKey: rankingsKeys.rateTrack(),
    mutationFn: async ({ rankingId, trackId, score }: RateTrackInput) => {
      const { data } = await http.patch<RankingView>(
        `/rankings/${rankingId}/tracks/${trackId}`,
        { score },
      );
      return data;
    },
    onMutate: async (variables) => {
      const key = rankingsKeys.byAlbum(variables.albumId);
      await queryClient.cancelQueries({ queryKey: key });

      const previous = queryClient.getQueryData<RankingView>(key);
      if (previous) {
        queryClient.setQueryData<RankingView>(key, {
          ...previous,
          entries: previous.entries.map((entry) =>
            entry.trackId === variables.trackId ? { ...entry, score: variables.score } : entry,
          ),
        });
      }

      return { previous };
    },
    onError: (_error, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(rankingsKeys.byAlbum(variables.albumId), context.previous);
      }
    },
    onSettled: (_data, _error, variables) => {
      if (queryClient.isMutating({ mutationKey: rankingsKeys.rateTrack() }) > 1) return;

      queryClient.invalidateQueries({ queryKey: rankingsKeys.byAlbum(variables.albumId) });
      queryClient.invalidateQueries({ queryKey: discoveryKeys.all });
    },
  });
}
