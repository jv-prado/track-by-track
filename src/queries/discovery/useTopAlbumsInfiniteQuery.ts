import { useInfiniteQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { Paginated, TopAlbumItem } from "@/shared/api/types";
import { discoveryKeys } from "./keys";

const PER_PAGE = 20;

export function useTopAlbumsInfiniteQuery() {
  return useInfiniteQuery({
    queryKey: discoveryKeys.topAlbumsInfinite(),
    queryFn: async ({ pageParam }) => {
      const { data } = await http.get<Paginated<TopAlbumItem>>("/discovery/top-albums", {
        params: { page: pageParam, perPage: PER_PAGE },
      });
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined,
  });
}
