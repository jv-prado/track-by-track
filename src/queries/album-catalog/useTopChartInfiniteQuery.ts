import { useInfiniteQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { Paginated, TopChartAlbum } from "@/shared/api/types";
import { albumCatalogKeys } from "./keys";

const PER_PAGE = 24;

/**
 * Chart de Top Albums da Apple (RSS público, sem auth) — page-based de
 * verdade: o chart (união das lojas, ~560 itens, ver
 * api/src/modules/album-catalog/apple-top-albums.service.ts) fica em cache no
 * backend e `genre` filtra lá, não aqui. Página pode vir com menos itens que
 * `perPage`: item sem correspondência no Spotify é descartado na resolução.
 */
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
