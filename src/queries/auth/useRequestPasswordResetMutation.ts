import { useMutation } from "@tanstack/react-query";
import { http } from "@/shared/api/http";

export interface RequestPasswordResetInput {
  email: string;
}

export function useRequestPasswordResetMutation() {
  return useMutation({
    mutationFn: async (input: RequestPasswordResetInput) => {
      const { data } = await http.post<{ message: string }>(
        "/auth/password-reset/request",
        input,
      );
      return data;
    },
  });
}
