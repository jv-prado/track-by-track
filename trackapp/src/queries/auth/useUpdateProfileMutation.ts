import { useMutation } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import { authStore } from "@/shared/auth/auth.store";
import type { CurrentUser } from "@/shared/api/types";

export interface UpdateProfileInput {
  displayName: string;
}

export function useUpdateProfileMutation() {
  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const { data } = await http.patch<CurrentUser>("/auth/me", input);
      return data;
    },
    onSuccess: (data) => {
      const token = authStore.getAccessToken();
      if (token) {
        authStore.setSession({
          accessToken: token,
          user: {
            id: data.id,
            email: data.email,
            displayName: data.displayName,
            avatarUrl: data.avatarUrl,
          },
        });
      }
    },
  });
}
