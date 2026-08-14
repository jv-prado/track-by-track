import { useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import { albumCatalogKeys } from "./keys";

const GENRES_STALE_TIME = 60 * 60_000;

export function useGenresQuery(enabled = true) {
  return useQuery({
    queryKey: albumCatalogKeys.genres(),
    queryFn: async () => {
      const { data } = await http.get<string[]>("/albums/genres");
      return data;
    },
    staleTime: GENRES_STALE_TIME,
    enabled,
  });
}
