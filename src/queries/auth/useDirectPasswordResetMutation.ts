import { useMutation } from "@tanstack/react-query";
import { http } from "@/shared/api/http";

export interface DirectPasswordResetInput {
  email: string;
  newPassword: string;
}

export function useDirectPasswordResetMutation() {
  return useMutation({
    mutationFn: async (input: DirectPasswordResetInput) => {
      const { data } = await http.post<{ message: string }>(
        "/auth/password-reset/direct",
        input,
      );
      return data;
    },
  });
}
