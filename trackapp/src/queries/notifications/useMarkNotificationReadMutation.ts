import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import { notificationsKeys } from "./keys";

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      await http.patch(`/notifications/${notificationId}/read`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
    },
  });
}
