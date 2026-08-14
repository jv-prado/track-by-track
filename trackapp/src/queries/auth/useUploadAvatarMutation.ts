import { useMutation } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import { authStore } from "@/shared/auth/auth.store";
import type { CurrentUser } from "@/shared/api/types";

export interface AvatarFile {
  uri: string;
  name: string;
  type: string;
}

/**
 * Porta de src/queries/auth/useUploadAvatarMutation.ts (web) — RN não tem
 * `File` do browser, `FormData` recebe `{ uri, name, type }` no lugar (mesmo
 * shape que `expo-image-picker` devolve, ver OwnProfilePage.tsx).
 */
export function useUploadAvatarMutation() {
  return useMutation({
    mutationFn: async (file: AvatarFile) => {
      const form = new FormData();
      // RN aceita esse objeto como valor de FormData pra upload multipart —
      // não existe equivalente a `File` do browser aqui.
      form.append("avatar", file as unknown as Blob);
      const { data } = await http.post<CurrentUser>("/auth/me/avatar", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
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
