import { useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { UnreadCount } from "@/shared/api/types";
import { useAuthStore } from "@/shared/auth/auth.store";
import { notificationsKeys } from "./keys";

/**
 * Badge do sino. Repolla de minuto em minuto porque não há push: é a única
 * query do app com `refetchInterval`, e o intervalo é longo de propósito —
 * notificação atrasar um minuto não machuca ninguém, martelar a API sim.
 */
export function useUnreadCountQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: notificationsKeys.unreadCount(),
    queryFn: async () => {
      const { data } = await http.get<UnreadCount>("/notifications/unread-count");
      return data.count;
    },
    enabled: isAuthenticated,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
