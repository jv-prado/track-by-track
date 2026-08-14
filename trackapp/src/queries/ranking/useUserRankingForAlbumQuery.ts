import { useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { RankingView } from "@/shared/api/types";
import { rankingsKeys } from "./keys";

export function useUserRankingForAlbumQuery(userId: string, albumId: string) {
  return useQuery({
    queryKey: rankingsKeys.byUserAndAlbum(userId, albumId),
    queryFn: async () => {
      const { data } = await http.get<RankingView>(`/rankings/users/${userId}/albums/${albumId}`);
      return data;
    },
    enabled: userId.length > 0 && albumId.length > 0,
  });
}
