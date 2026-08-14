import { useMutation } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import { authStore } from "@/shared/auth/auth.store";
import { secureTokenStorage } from "@/shared/auth/secure-storage";
import type { LoginResponse } from "@/shared/api/types";

export interface LoginInput {
  email: string;
  password: string;
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data } = await http.post<LoginResponse>("/auth/login", input);
      return data;
    },
    onSuccess: async (data) => {
      authStore.setSession({ accessToken: data.accessToken, user: data.user });
      // web recebe isso via cookie httpOnly — mobile recebe no corpo (X-Client:
      // mobile, ver auth.controller.ts) e guarda em secure-store.
      if (data.refreshToken) {
        await secureTokenStorage.setRefreshToken(data.refreshToken);
      }
    },
  });
}
