import { useInfiniteQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { NewReleaseAlbum, Paginated } from "@/shared/api/types";
import { albumCatalogKeys } from "./keys";

const PER_PAGE = 24;

/**
 * Lançamentos recentes do Spotify, ordenados por data. `genre` é vocabulário
 * curado (ver useNewReleasesGenresQuery), diferente do chart da Apple.
 * Aba padrão do Descobrir; Top Charts é a alternativa opcional.
 */
export function useNewReleasesInfiniteQuery(genre?: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: albumCatalogKeys.newReleasesInfinite(genre),
    queryFn: async ({ pageParam }) => {
      const { data } = await http.get<Paginated<NewReleaseAlbum>>("/albums/new-releases", {
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
