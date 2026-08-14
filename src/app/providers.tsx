import { Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { queryClient } from "./query-client";
import { router } from "@/router";
import { useAuthStore } from "@/shared/auth/auth.store";
import { useSessionQuery } from "@/queries/auth";
import { Toaster } from "@/shared/ui/Toast";

function SessionSplash() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-grafite">
      <img src="/src/assets/logo.webp" alt="" className="w-16 animate-float" />
    </div>
  );
}

/**
 * Só renderiza o router depois que a sessão foi reidratada — sem esse gate a
 * árvore monta deslogada por um instante e o guard de rota chuta o usuário
 * autenticado pro /login. Quem espera é o Suspense, não um estado de loading
 * próprio: a espera é a própria query da sessão.
 */
function AppRouter() {
  useSessionQuery();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <RouterProvider router={router} context={{ auth: { isAuthenticated }, queryClient }} />
  );
}

export function AppProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<SessionSplash />}>
        <AppRouter />
      </Suspense>
      <Toaster />
    </QueryClientProvider>
  );
}
