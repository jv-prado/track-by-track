import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { RankingView } from "@/shared/api/types";
import { discoveryKeys } from "@/queries/discovery/keys";
import { rankingsKeys } from "./keys";

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
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: rankingsKeys.byAlbum(variables.albumId) });
      queryClient.invalidateQueries({ queryKey: discoveryKeys.all });
    },
  });
}
