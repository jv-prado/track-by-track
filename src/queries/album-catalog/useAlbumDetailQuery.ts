import { useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { AlbumDetail } from "@/shared/api/types";
import { albumCatalogKeys } from "./keys";

export function useAlbumDetailQuery(albumId: string) {
  return useQuery({
    queryKey: albumCatalogKeys.detail(albumId),
    queryFn: async () => {
      const { data } = await http.get<AlbumDetail>(`/albums/${albumId}`);
      return data;
    },
    enabled: albumId.length > 0,
  });
}
