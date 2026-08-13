import { useMutation } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import { authStore } from "@/shared/auth/auth.store";
import type { CurrentUser } from "@/shared/api/types";

export function useUploadAvatarMutation() {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("avatar", file);
      const { data } = await http.post<CurrentUser>("/auth/me/avatar", form);
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
