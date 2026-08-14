import { useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import { albumCatalogKeys } from "./keys";

/**
 * Prévia de 30s sob demanda: `enabled: false` — só busca quando o componente
 * chama `refetch()` (clique em play), não pra toda faixa visível na tela.
 * Evita bater no iTunes pra faixa que ninguém nunca vai tocar.
 */
export function useTrackPreviewQuery(albumId: string, trackId: string) {
  return useQuery({
    queryKey: albumCatalogKeys.trackPreview(albumId, trackId),
    queryFn: async () => {
      const { data } = await http.get<{ previewUrl: string | null }>(
        `/albums/${albumId}/tracks/${trackId}/preview`,
      );
      return data.previewUrl;
    },
    enabled: false,
    staleTime: Infinity,
    gcTime: 30 * 60_000,
  });
}
