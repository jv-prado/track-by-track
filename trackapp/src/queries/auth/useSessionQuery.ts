import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { http, refreshAccessToken } from "@/shared/api/http";
import { authStore } from "@/shared/auth/auth.store";
import type { CurrentUser } from "@/shared/api/types";
import { authKeys } from "./keys";

/**
 * Reidrata a sessão no boot do app a partir do refresh token salvo no
 * secure-store (equivalente mobile do cookie httpOnly do web — mesmo
 * princípio da seção 4.4 do CLAUDE.md, adaptado em @/shared/api/http.ts).
 * Sem token salvo (ou refresh falho) = sem sessão, resultado normal (`null`),
 * não erro de tela — mesma regra do web.
 */
export const sessionQueryOptions = queryOptions({
  queryKey: authKeys.session(),
  queryFn: async (): Promise<CurrentUser | null> => {
    try {
      const accessToken = await refreshAccessToken();
      const { data } = await http.get<CurrentUser>("/auth/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      authStore.setSession({
        accessToken,
        user: {
          id: data.id,
          email: data.email,
          displayName: data.displayName,
          avatarUrl: data.avatarUrl,
        },
      });
      return data;
    } catch {
      return null;
    }
  },
  staleTime: Infinity,
  retry: false,
});

export function useSessionQuery() {
  return useSuspenseQuery(sessionQueryOptions);
}
