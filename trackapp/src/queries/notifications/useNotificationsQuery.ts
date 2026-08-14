import { useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { NotificationView, Paginated } from "@/shared/api/types";
import { notificationsKeys } from "./keys";

const PER_PAGE = 20;

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
