import { Redirect } from "expo-router";
import { useAuthStore } from "@/shared/auth/auth.store";

/**
 * Equivalente de _app.index.tsx (web) — só decide pra onde redirecionar.
 * Conteúdo de verdade mora nas rotas de `(app)`/`(auth)`.
 */
export default function IndexScreen() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return <Redirect href={isAuthenticated ? "/feed" : "/login"} />;
}
