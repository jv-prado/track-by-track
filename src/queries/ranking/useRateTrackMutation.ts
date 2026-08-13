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
    // A estrela precisa preencher no clique, não no round-trip: sem isso, cliques
    // rápidos parecem "não pegar" enquanto a request de 300ms está em voo.
    onMutate: async (variables) => {
      const key = rankingsKeys.byAlbum(variables.albumId);
      await queryClient.cancelQueries({ queryKey: key });

      const previous = queryClient.getQueryData<RankingView>(key);
      if (previous) {
        queryClient.setQueryData<RankingView>(key, {
          ...previous,
          entries: previous.entries.map((entry) =>
            entry.trackId === variables.trackId
              ? { ...entry, score: variables.score }
              : entry,
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
      // Com várias faixas avaliadas em sequência, respostas podem chegar fora de ordem
      // e uma antiga sobrescreveria a nota mais nova. Só a última a assentar refaz o fetch;
      // até lá o cache otimista segura a UI. `isMutating` inclui a que está assentando agora.
      if (queryClient.isMutating({ mutationKey: rankingsKeys.rateTrack() }) > 1) return;

      queryClient.invalidateQueries({ queryKey: rankingsKeys.byAlbum(variables.albumId) });
      // Nota mudou -> média/top3 do álbum e listagens (feed/perfil/top-álbuns) ficam stale.
      queryClient.invalidateQueries({ queryKey: discoveryKeys.all });
    },
  });
}
