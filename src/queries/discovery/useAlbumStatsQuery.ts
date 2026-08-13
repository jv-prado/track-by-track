import { useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { AlbumStats } from "@/shared/api/types";
import { discoveryKeys } from "./keys";

export function useAlbumStatsQuery(albumId: string) {
  return useQuery({
    queryKey: discoveryKeys.albumStats(albumId),
    queryFn: async () => {
      const { data } = await http.get<AlbumStats>(`/discovery/albums/${albumId}/stats`);
      return data;
    },
    enabled: albumId.length > 0,
  });
}
