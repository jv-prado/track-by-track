import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import type { AuthUser } from "@/shared/auth/auth.store";

export interface RouterContext {
  auth: { isAuthenticated: boolean; user: AuthUser | null };
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
});
