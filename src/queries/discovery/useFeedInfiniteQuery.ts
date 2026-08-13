import { useInfiniteQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { FeedItem, Paginated } from "@/shared/api/types";
import { discoveryKeys } from "./keys";

// 30 fecha 4 linhas no grid mais largo: preenche a primeira tela em UMA request,
// sem cascata de paginação no first paint.
const PER_PAGE = 30;

/**
 * Pagina por cursor: a API filtra por `(createdAt, _id)` indexado em vez de
 * `$skip`, então a página 100 custa o mesmo que a primeira. `pageParam` vazio
 * significa primeira página.
 */
export function useFeedInfiniteQuery() {
  return useInfiniteQuery({
    queryKey: discoveryKeys.feedInfinite(),
    queryFn: async ({ pageParam }) => {
      const { data } = await http.get<Paginated<FeedItem>>("/discovery/feed", {
        params: { perPage: PER_PAGE, ...(pageParam ? { cursor: pageParam } : {}) },
      });
      return data;
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
  });
}
