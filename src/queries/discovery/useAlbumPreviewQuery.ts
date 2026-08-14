import { useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { AlbumPreview } from "@/shared/api/types";
import { discoveryKeys } from "./keys";

/** Join server-side de álbum+ranking pra sheet de preview do feed — 1 request em vez de 2. */
export function useAlbumPreviewQuery(userId: string, albumId: string) {
  return useQuery({
    queryKey: discoveryKeys.albumPreview(userId, albumId),
    queryFn: async () => {
      const { data } = await http.get<AlbumPreview>(`/discovery/album-preview/${userId}/${albumId}`);
      return data;
    },
    enabled: userId.length > 0 && albumId.length > 0,
  });
}
