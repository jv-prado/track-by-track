import { useInfiniteQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { FeedItem, Paginated } from "@/shared/api/types";
import { discoveryKeys, type FeedScope } from "./keys";

// 30 fecha 4 linhas no grid mais largo: preenche a primeira tela em UMA request,
// sem cascata de paginação no first paint.
const PER_PAGE = 30;

/**
 * Pagina por cursor: a API filtra por `(createdAt, _id)` indexado em vez de
 * `$skip`, então a página 100 custa o mesmo que a primeira. `pageParam` vazio
 * significa primeira página.
 *
 * `scope: "following"` traz só quem o usuário segue e exige sessão — por isso a
 * chave inclui o escopo (senão a aba trocaria sem refetch, mostrando o feed errado).
 */
export function useFeedInfiniteQuery(scope: FeedScope = "global", genre?: string) {
  return useInfiniteQuery({
    queryKey: discoveryKeys.feedInfinite(scope, genre),
    queryFn: async ({ pageParam }) => {
      const { data } = await http.get<Paginated<FeedItem>>("/discovery/feed", {
        params: {
          perPage: PER_PAGE,
          scope,
          ...(genre ? { genre } : {}),
          ...(pageParam ? { cursor: pageParam } : {}),
        },
      });
      return data;
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
  });
}
