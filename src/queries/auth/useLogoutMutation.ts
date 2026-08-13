import { useMutation } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import { authStore } from "@/shared/auth/auth.store";

export function useLogoutMutation() {
  return useMutation({
    mutationFn: async () => {
      await http.post("/auth/logout");
    },
    onSettled: () => {
      authStore.clearSession();
    },
  });
}
