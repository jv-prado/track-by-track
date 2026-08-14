import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { FollowStats } from "@/shared/api/types";
import { discoveryKeys } from "@/queries/discovery/keys";
import { followsKeys } from "./keys";

interface FollowContext {
  previous?: FollowStats;
}

export function useFollowMutation() {
  const queryClient = useQueryClient();

  return useMutation<FollowStats, unknown, string, FollowContext>({
    mutationFn: async (userId: string) => {
      const { data } = await http.post<FollowStats>(`/users/${userId}/follow`);
      return data;
    },
    onMutate: async (userId) => {
      const key = followsKeys.stats(userId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<FollowStats>(key);
      if (previous && !previous.isFollowing) {
        queryClient.setQueryData<FollowStats>(key, {
          ...previous,
          followers: previous.followers + 1,
          isFollowing: true,
        });
      }
      return { previous };
    },
    onError: (_error, userId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(followsKeys.stats(userId), context.previous);
      }
    },
    onSuccess: (stats, userId) => {
      queryClient.setQueryData(followsKeys.stats(userId), stats);
    },
    onSettled: (_data, _error, userId) => {
      queryClient.invalidateQueries({ queryKey: followsKeys.followers(userId) });
      queryClient.invalidateQueries({ queryKey: discoveryKeys.all });
    },
  });
}
