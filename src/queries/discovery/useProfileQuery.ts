import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { FeedItem, Paginated } from "@/shared/api/types";
import { discoveryKeys, type ProfileFilters } from "./keys";

export function useProfileQuery(userId: string, filters: ProfileFilters) {
  return useQuery({
    queryKey: discoveryKeys.profile(userId, filters),
    queryFn: async () => {
      const { data } = await http.get<Paginated<FeedItem>>(`/discovery/users/${userId}`, {
        params: filters,
      });
      return data;
    },
    enabled: userId.length > 0,
    placeholderData: keepPreviousData,
  });
}
