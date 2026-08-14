import { useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { FollowStats } from "@/shared/api/types";
import { followsKeys } from "./keys";

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
