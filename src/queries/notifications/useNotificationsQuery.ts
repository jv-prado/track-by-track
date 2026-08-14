import { useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { NotificationView, Paginated } from "@/shared/api/types";
import { notificationsKeys } from "./keys";

const PER_PAGE = 20;

/** Só busca quando o painel abre — `enabled` evita carregar a lista à toa. */
export function useNotificationsQuery(enabled: boolean) {
  return useQuery({
    queryKey: notificationsKeys.list(),
    queryFn: async () => {
      const { data } = await http.get<Paginated<NotificationView>>("/notifications", {
        params: { perPage: PER_PAGE },
      });
      return data;
    },
    enabled,
  });
}
