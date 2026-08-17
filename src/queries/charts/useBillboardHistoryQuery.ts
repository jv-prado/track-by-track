import { useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { BillboardHistory } from "@/shared/api/types";
import { chartsKeys } from "./keys";

/** `currentRank: null` e `history: []` quando o álbum nunca entrou no Billboard 200 — não é erro. */
export function useBillboardHistoryQuery(albumId: string, enabled = true) {
  return useQuery({
    queryKey: chartsKeys.billboard200History(albumId),
    queryFn: async () => {
      const { data } = await http.get<BillboardHistory>(`/charts/billboard-200/${albumId}`);
      return data;
    },
    enabled: enabled && albumId.length > 0,
  });
}
