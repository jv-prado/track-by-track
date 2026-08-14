import { useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import { albumCatalogKeys } from "./keys";

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
