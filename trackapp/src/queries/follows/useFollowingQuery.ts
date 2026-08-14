import { useInfiniteQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { FollowUserItem, Paginated } from "@/shared/api/types";
import { followsKeys } from "./keys";

const PER_PAGE = 10;

export function useFollowingQuery(userId: string) {
  return useInfiniteQuery({
    queryKey: followsKeys.following(userId),
    queryFn: async ({ pageParam }) => {
      const { data } = await http.get<Paginated<FollowUserItem>>(`/users/${userId}/following`, {
        params: { page: pageParam, perPage: PER_PAGE },
      });
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined,
    enabled: userId.length > 0,
  });
}
