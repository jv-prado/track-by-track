import { useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import { isApiError } from "@/shared/api/errors";
import type { RankingView } from "@/shared/api/types";
import { rankingsKeys } from "./keys";

export function useMyRankingForAlbumQuery(albumId: string) {
  return useQuery({
    queryKey: rankingsKeys.byAlbum(albumId),
    queryFn: async () => {
      try {
        const { data } = await http.get<RankingView>(`/rankings/me/${albumId}`);
        return data;
      } catch (error) {
        if (isApiError(error) && error.statusCode === 404) return null;
        throw error;
      }
    },
    enabled: albumId.length > 0,
  });
}
