import { useInfiniteQuery } from "@tanstack/react-query";
import { http } from "@/shared/api/http";
import type { AlbumReviewItem, Paginated } from "@/shared/api/types";
import { discoveryKeys } from "./keys";

const PER_PAGE = 5;

export function useAlbumReviewsInfiniteQuery(albumId: string) {
  return useInfiniteQuery({
    queryKey: discoveryKeys.albumReviewsInfinite(albumId),
    queryFn: async ({ pageParam }) => {
      const { data } = await http.get<Paginated<AlbumReviewItem>>(
        `/discovery/albums/${albumId}/reviews`,
        { params: { page: pageParam, perPage: PER_PAGE } },
      );
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined,
    enabled: albumId.length > 0,
  });
}
