import { useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { CurrentUser } from "@/shared/api/types";
import { authKeys } from "./keys";

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: async () => {
      const { data } = await http.get<CurrentUser>("/auth/me");
      return data;
    },
  });
}
