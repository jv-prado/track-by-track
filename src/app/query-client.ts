import { QueryClient } from "@tanstack/react-query";
import { isApiError } from "@/shared/api/errors";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: (count, error) => {
        const status = isApiError(error) ? error.statusCode : undefined;
        if (status && status >= 400 && status < 500) return false; // não insista em 4xx
        return count < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});
