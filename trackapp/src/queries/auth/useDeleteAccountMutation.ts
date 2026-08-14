import { useMutation } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import { authStore } from "@/shared/auth/auth.store";
import { secureTokenStorage } from "@/shared/auth/secure-storage";

export interface DeleteAccountInput {
  password: string;
}

export function useDeleteAccountMutation() {
  return useMutation({
    mutationFn: async (input: DeleteAccountInput) => {
      await http.delete("/auth/me", { data: input });
    },
    onSettled: async () => {
      authStore.clearSession();
      await secureTokenStorage.clearRefreshToken();
    },
  });
}
