import { useQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import { discoveryKeys } from "./keys";
import type { UserStats } from "./useUserStatsQuery";

export interface UserStatsItem extends UserStats {
  userId: string;
}

/** Teto de ids por request na API (ver users-stats-query.dto.ts). */
const CHUNK_SIZE = 50;

/**
 * Stats de uma página inteira de usuários numa request só — lista de seguidores
 * e busca renderizam um card por usuário, e um `useUserStatsQuery` por card
 * viraria N chamadas HTTP por página.
 */
export function useUsersStatsQuery(userIds: string[], completedOnly = true) {
  // Ordenado + deduplicado pra chave estável: mesma página remontada não refaz fetch.
  const ids = [...new Set(userIds)].sort();

  return useQuery({
    queryKey: discoveryKeys.usersStats(ids, completedOnly),
    queryFn: async () => {
      const chunks: string[][] = [];
      for (let index = 0; index < ids.length; index += CHUNK_SIZE) {
        chunks.push(ids.slice(index, index + CHUNK_SIZE));
      }

      const responses = await Promise.all(
        chunks.map((chunk) =>
          http.get<{ data: UserStatsItem[] }>("/discovery/users-stats", {
            params: { userIds: chunk.join(","), completedOnly },
          }),
        ),
      );

      return new Map(
        responses.flatMap((response) =>
          response.data.data.map((item) => [item.userId, item] as const),
        ),
      );
    },
    enabled: ids.length > 0,
    staleTime: 60_000,
  });
}
