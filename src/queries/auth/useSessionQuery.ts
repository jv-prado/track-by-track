import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { http, refreshAccessToken } from "@/shared/api/http";
import { authStore } from "@/shared/auth/auth.store";
import type { CurrentUser } from "@/shared/api/types";
import { authKeys } from "./keys";

/**
 * Reidrata a sessão no boot a partir do cookie httpOnly: sem isso, recarregar a
 * página deslogaria o usuário mesmo com sessão válida. Fica no TanStack Query
 * (e não num `useEffect`) porque o cache é quem garante execução única — em
 * StrictMode o effect montava duas vezes, e dois refresh concorrentes com o
 * mesmo cookie fazem o servidor tratar como reuso e revogar a família inteira.
 *
 * Nunca rejeita: "sem sessão" é resultado normal (`null`), não erro de tela.
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
