import { useInfiniteQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { Paginated, TopChartAlbum } from "@/shared/api/types";
import { albumCatalogKeys } from "./keys";

const PER_PAGE = 24;

export function useTopChartInfiniteQuery(genre?: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: albumCatalogKeys.topChartInfinite(genre),
    queryFn: async ({ pageParam }) => {
      const { data } = await http.get<Paginated<TopChartAlbum>>("/albums/top-chart", {
        params: { genre, page: pageParam, perPage: PER_PAGE },
      });
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined,
    enabled,
  });
}
