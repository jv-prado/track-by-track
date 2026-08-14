import { useInfiniteQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { Paginated, PublicUser } from "@/shared/api/types";
import { followsKeys } from "./keys";

const PER_PAGE = 24;

export function useSearchUsersInfiniteQuery(query: string) {
  return useInfiniteQuery({
    queryKey: followsKeys.searchUsers(query),
    queryFn: async ({ pageParam }) => {
      const { data } = await http.get<Paginated<PublicUser>>("/users/search", {
        params: { q: query, page: pageParam, perPage: PER_PAGE },
      });
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined,
    enabled: query.trim().length > 0,
  });
}
