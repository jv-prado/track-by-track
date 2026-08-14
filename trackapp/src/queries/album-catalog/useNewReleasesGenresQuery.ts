import { useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import { albumCatalogKeys } from "./keys";

const NEW_RELEASES_GENRES_STALE_TIME = 60 * 60_000;

export function useNewReleasesGenresQuery(enabled = true) {
  return useQuery({
    queryKey: albumCatalogKeys.newReleasesGenres(),
    queryFn: async () => {
      const { data } = await http.get<string[]>("/albums/new-releases/genres");
      return data;
    },
    staleTime: NEW_RELEASES_GENRES_STALE_TIME,
    enabled,
  });
}
