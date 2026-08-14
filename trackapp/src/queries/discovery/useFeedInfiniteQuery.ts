import { useInfiniteQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { FeedItem, Paginated } from "@/shared/api/types";
import { discoveryKeys, type FeedScope } from "./keys";

const PER_PAGE = 30;

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
