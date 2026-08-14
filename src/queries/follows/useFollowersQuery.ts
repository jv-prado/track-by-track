import { useInfiniteQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { FollowUserItem, Paginated } from "@/shared/api/types";
import { followsKeys } from "./keys";

// Modal de lista — 10 por página é suficiente pra encher a área visível sem
// puxar seguidor demais de gente que nunca rola até o fim.
const PER_PAGE = 10;

export function useFollowersQuery(userId: string) {
  return useInfiniteQuery({
    queryKey: followsKeys.followers(userId),
    queryFn: async ({ pageParam }) => {
      const { data } = await http.get<Paginated<FollowUserItem>>(
        `/users/${userId}/followers`,
        { params: { page: pageParam, perPage: PER_PAGE } },
      );
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined,
    enabled: userId.length > 0,
  });
}
