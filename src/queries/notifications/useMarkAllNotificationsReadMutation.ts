import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import { notificationsKeys } from "./keys";

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await http.post("/notifications/read-all");
    },
    // Zera o badge no clique: a lista inteira já está na tela quando o usuário
    // aperta "marcar todas", esperar o round-trip só faz o número piscar.
    onMutate: () => {
      queryClient.setQueryData(notificationsKeys.unreadCount(), 0);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
    },
  });
}
