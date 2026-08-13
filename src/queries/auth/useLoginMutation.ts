import { useMutation } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import { authStore } from "@/shared/auth/auth.store";
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
    onSuccess: (data) => {
      authStore.setSession({ accessToken: data.accessToken, user: data.user });
    },
  });
}
