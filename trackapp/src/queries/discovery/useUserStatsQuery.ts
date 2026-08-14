import { useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import { discoveryKeys } from "./keys";

export interface UserStats {
  total: number;
  averageScore: number;
  tracksRated: number;
}

export function useUserStatsQuery(userId: string) {
  return useQuery({
    queryKey: discoveryKeys.profileStats(userId),
    queryFn: async () => {
      const { data } = await http.get<UserStats>(`/discovery/users/${userId}/stats`);
      return data;
    },
    enabled: userId.length > 0,
  });
}
