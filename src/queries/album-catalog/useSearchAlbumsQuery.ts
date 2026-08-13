import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { AlbumSummary, Paginated } from "@/shared/api/types";
import { albumCatalogKeys } from "./keys";

export interface SearchAlbumsFilters {
  page: number;
  perPage: number;
}

export function useSearchAlbumsQuery(query: string, filters: SearchAlbumsFilters) {
  return useQuery({
    queryKey: albumCatalogKeys.search(query, filters),
    queryFn: async () => {
      const { data } = await http.get<Paginated<AlbumSummary>>("/albums/search", {
        params: { q: query, page: filters.page, perPage: filters.perPage },
      });
      return data;
    },
    enabled: query.trim().length > 0,
    placeholderData: keepPreviousData,
  });
}
