import { useMutation } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import { authStore } from "@/shared/auth/auth.store";
import { secureTokenStorage } from "@/shared/auth/secure-storage";

export function useLogoutMutation() {
  return useMutation({
    mutationFn: async () => {
      // web manda pelo cookie automático — mobile não tem cookie, manda o
      // token salvo no corpo.
      const refreshToken = await secureTokenStorage.getRefreshToken();
      await http.post("/auth/logout", refreshToken ? { refreshToken } : {});
    },
    onSettled: async () => {
      authStore.clearSession();
      await secureTokenStorage.clearRefreshToken();
    },
  });
}
