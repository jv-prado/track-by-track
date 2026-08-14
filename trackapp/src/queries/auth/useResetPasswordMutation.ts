import { useMutation } from "@tanstack/react-query";
import { http } from "@/shared/api/http";

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: async (input: ResetPasswordInput) => {
      const { data } = await http.post<{ message: string }>(
        "/auth/password-reset/confirm",
        input,
      );
      return data;
    },
  });
}
