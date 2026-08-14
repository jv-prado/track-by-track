import { useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { FollowStats } from "@/shared/api/types";
import { followsKeys } from "./keys";

/** `isFollowing` depende de quem pergunta — a API lê o token quando existe. */
export function useFollowStatsQuery(userId: string) {
  return useQuery({
    queryKey: followsKeys.stats(userId),
    queryFn: async () => {
      const { data } = await http.get<FollowStats>(`/users/${userId}/follow-stats`);
      return data;
    },
    enabled: userId.length > 0,
  });
}
