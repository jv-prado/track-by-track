import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { FollowStats } from "@/shared/api/types";
import { discoveryKeys } from "@/queries/discovery/keys";
import { followsKeys } from "./keys";

interface UnfollowContext {
  previous?: FollowStats;
}

export function useUnfollowMutation() {
  const queryClient = useQueryClient();

  return useMutation<FollowStats, unknown, string, UnfollowContext>({
    mutationFn: async (userId: string) => {
      const { data } = await http.delete<FollowStats>(`/users/${userId}/follow`);
      return data;
    },
    onMutate: async (userId) => {
      const key = followsKeys.stats(userId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<FollowStats>(key);
      if (previous?.isFollowing) {
        queryClient.setQueryData<FollowStats>(key, {
          ...previous,
          followers: Math.max(0, previous.followers - 1),
          isFollowing: false,
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
