import { useInfiniteQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { FeedItem, Paginated } from "@/shared/api/types";
import { discoveryKeys, type ProfileInfiniteFilters } from "./keys";

const PER_PAGE = 20;

export function useProfileInfiniteQuery(userId: string, filters: ProfileInfiniteFilters) {
  return useInfiniteQuery({
    queryKey: discoveryKeys.profileInfinite(userId, filters),
    queryFn: async ({ pageParam }) => {
      const { data } = await http.get<Paginated<FeedItem>>(`/discovery/users/${userId}`, {
        params: { ...filters, page: pageParam, perPage: PER_PAGE },
      });
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined,
    enabled: userId.length > 0,
  });
}
