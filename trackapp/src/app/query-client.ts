import { QueryClient } from "@tanstack/react-query";
import { isApiError } from "@/shared/api/errors";

// Porta 1:1 de src/app/query-client.ts (web) — mesmos defaults.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: (count, error) => {
        const status = isApiError(error) ? error.statusCode : undefined;
        if (status && status >= 400 && status < 500) return false;
        return count < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});
