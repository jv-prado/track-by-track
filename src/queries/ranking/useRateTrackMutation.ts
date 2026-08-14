import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { RankingView } from "@/shared/api/types";
import { discoveryKeys } from "@/queries/discovery/keys";
import { useAuthStore } from "@/shared/auth/auth.store";
import { rankingsKeys } from "./keys";
import { writeLastEditedAlbum } from "./write-last-edited-album";

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
  const userId = useAuthStore((s) => s.user?.id);

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
    onSettled: (data, error, variables, context) => {
      // Com várias faixas avaliadas em sequência, respostas podem chegar fora de ordem
      // e uma antiga sobrescreveria a nota mais nova. Só a última a assentar refaz o fetch;
      // até lá o cache otimista segura a UI. `isMutating` inclui a que está assentando agora.
      if (queryClient.isMutating({ mutationKey: rankingsKeys.rateTrack() }) > 1) return;

      // Não dá pra só gravar `data` desta resposta no cache: com faixas avaliadas em
      // sequência rápida, a última a assentar pode não ser a última processada no servidor
      // (concorrência de PATCHes na mesma faixa/documento). Só um GET novo garante o estado
      // real — e é também como o front descobre que zerar a última nota apagou o ranking no
      // servidor (ele some quando fica vazio — ver `persistRanking` na API): o 404 vira
      // `data: null` aqui, disparando a recriação em AlbumRatingView.
      queryClient.invalidateQueries({ queryKey: rankingsKeys.byAlbum(variables.albumId) });

      if (error || !data) return;

      if (userId) writeLastEditedAlbum(queryClient, userId, variables.albumId, data);

      // Feed/top-álbuns/stats/reviews da comunidade só listam ranking completo (mesma regra
      // do backend em `invalidate-ranking-cache.ts`) — nota trocada dentro de um ranking que
      // segue incompleto não muda nada público. Invalidar isso a cada estrela clicada só
      // reprocessava agregação no Mongo pra um resultado idêntico.
      const wasComplete = context?.previous?.progress.percentage === 100;
      const isComplete = data.progress.percentage === 100;
      if (wasComplete || isComplete) {
        queryClient.invalidateQueries({ queryKey: discoveryKeys.all });
      }
    },
  });
}
