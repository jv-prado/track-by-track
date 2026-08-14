import { useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { LastEditedAlbum } from "@/shared/api/types";
import { discoveryKeys } from "./keys";

/** Álbum onde o usuário logado mexeu por último — quick access da sidebar. */
export function useLastEditedAlbumQuery(userId: string | undefined) {
  return useQuery({
    queryKey: discoveryKeys.lastEditedAlbum(userId ?? ""),
    queryFn: async () => {
      const { data } = await http.get<LastEditedAlbum | null>("/discovery/me/last-edited-album");
      return data;
    },
    enabled: Boolean(userId),
  });
}
