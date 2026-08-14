import { useMutation } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { RegisterResponse } from "@/shared/api/types";

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      const { data } = await http.post<RegisterResponse>("/auth/register", input);
      return data;
    },
  });
}
