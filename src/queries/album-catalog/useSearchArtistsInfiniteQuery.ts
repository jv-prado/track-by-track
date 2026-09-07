import { useInfiniteQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { ArtistSummary, Paginated } from "@/shared/api/types";
import { albumCatalogKeys } from "./keys";

const PER_PAGE = 24;

export function useSearchArtistsInfiniteQuery(query: string) {
  return useInfiniteQuery({
    queryKey: albumCatalogKeys.searchArtistsInfinite(query),
    queryFn: async ({ pageParam }) => {
      const { data } = await http.get<Paginated<ArtistSummary>>("/albums/search/artists", {
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
