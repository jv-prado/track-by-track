import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { queryClient } from "./query-client";
import { router } from "@/router";
import { useAuthStore } from "@/shared/auth/auth.store";
import { useAuthBootstrap } from "@/shared/auth/use-auth-bootstrap";
import { Toaster } from "@/shared/ui/Toast";

export function AppProviders() {
  const { isLoading } = useAuthBootstrap();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-grafite">
        <img src="/src/assets/logo-icone.svg" alt="" className="w-16 animate-float" />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} context={{ auth: { isAuthenticated }, queryClient }} />
      <Toaster />
    </QueryClientProvider>
  );
}
