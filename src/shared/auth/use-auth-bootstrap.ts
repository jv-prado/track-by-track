import { useEffect, useState } from "react";
import { http, refreshAccessToken } from "@/shared/api/http";
import { authStore } from "./auth.store";
import type { CurrentUser, LoginResponse } from "@/shared/api/types";

/**
 * Reidrata a sessão no boot da app via /auth/refresh (cookie httpOnly) — sem
 * isso, recarregar a página sempre deslogaria o usuário mesmo com sessão
 * válida. Bloqueia a renderização até resolver (evita "flash" de deslogado).
 *
 * Usa refreshAccessToken() (single-flight) em vez de POST cru — StrictMode
 * dobra o mount do effect em dev, e duas chamadas concorrentes de refresh
 * com o mesmo cookie fazem o servidor detectar reuso e revogar a família
 * inteira do token, deslogando o usuário.
 */
export function useAuthBootstrap() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const accessToken = await refreshAccessToken();

        const meResponse = await http.get<CurrentUser>("/auth/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!cancelled) {
          const user: LoginResponse["user"] = {
            id: meResponse.data.id,
            email: meResponse.data.email,
            displayName: meResponse.data.displayName,
          };
          authStore.setSession({ accessToken, user: { ...user, avatarUrl: meResponse.data.avatarUrl } });
        }
      } catch {
        // Sem sessão válida — segue deslogado, sem erro visível.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  return { isLoading };
}
