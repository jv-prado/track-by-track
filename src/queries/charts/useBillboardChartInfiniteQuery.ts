import { useInfiniteQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { BillboardChartAlbum, Paginated } from "@/shared/api/types";
import { chartsKeys } from "./keys";

const PER_PAGE = 40;

/**
 * Sempre a semana mais recente já sincronizada (backend resolve isso, ver
 * `charts.service.ts`) — sem filtro de gênero, a fonte (billboard-json) não
 * traz gênero por item.
 */
export function useBillboardChartInfiniteQuery(enabled = true) {
  return useInfiniteQuery({
    queryKey: chartsKeys.billboard200Infinite(),
    queryFn: async ({ pageParam }) => {
      const { data } = await http.get<Paginated<BillboardChartAlbum>>(
        "/charts/billboard-200",
        { params: { page: pageParam, perPage: PER_PAGE } },
      );
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined,
    enabled,
  });
}
