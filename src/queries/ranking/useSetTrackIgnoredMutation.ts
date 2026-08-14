import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { RankingView } from "@/shared/api/types";
import { discoveryKeys } from "@/queries/discovery/keys";
import { useAuthStore } from "@/shared/auth/auth.store";
import { rankingsKeys } from "./keys";
import { writeLastEditedAlbum } from "./write-last-edited-album";

export interface SetTrackIgnoredInput {
  rankingId: string;
  trackId: string;
  ignored: boolean;
  albumId: string;
}

interface SetTrackIgnoredContext {
  previous?: RankingView;
}

export function useSetTrackIgnoredMutation() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation<RankingView, unknown, SetTrackIgnoredInput, SetTrackIgnoredContext>({
    mutationKey: rankingsKeys.setTrackIgnored(),
    mutationFn: async ({ rankingId, trackId, ignored }: SetTrackIgnoredInput) => {
      const { data } = await http.patch<RankingView>(
        `/rankings/${rankingId}/tracks/${trackId}/ignore`,
        { ignored },
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
            entry.trackId === variables.trackId
              ? { ...entry, ignored: variables.ignored, score: 0 }
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
      // Também é como o front descobre que ignorar a última faixa avaliada esvaziou o
      // ranking no servidor (apagado nesse caso — ver `persistRanking` na API).
      queryClient.invalidateQueries({ queryKey: rankingsKeys.byAlbum(variables.albumId) });

      if (error || !data) return;

      if (userId) writeLastEditedAlbum(queryClient, userId, variables.albumId, data);

      // Mesma regra do backend (`invalidate-ranking-cache.ts`): feed/top-álbuns/stats/reviews
      // da comunidade só listam ranking completo, então só importa quando isso muda aqui.
      const wasComplete = context?.previous?.progress.percentage === 100;
      const isComplete = data.progress.percentage === 100;
      if (wasComplete || isComplete) {
        queryClient.invalidateQueries({ queryKey: discoveryKeys.all });
      }
    },
  });
}
