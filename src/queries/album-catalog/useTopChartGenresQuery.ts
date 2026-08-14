import { useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import { albumCatalogKeys } from "./keys";

// Chart muda ~1x/dia no backend (cache de 12h) — staleTime longo aqui evita
// refetch a cada abertura do filtro.
const CHART_GENRES_STALE_TIME = 60 * 60_000;

export function useTopChartGenresQuery(enabled = true) {
  return useQuery({
    queryKey: albumCatalogKeys.topChartGenres(),
    queryFn: async () => {
      const { data } = await http.get<string[]>("/albums/top-chart/genres");
      return data;
    },
    staleTime: CHART_GENRES_STALE_TIME,
    enabled,
  });
}
