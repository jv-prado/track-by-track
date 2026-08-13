import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Music, Trophy } from "lucide-react";
import { useTopAlbumsInfiniteQuery } from "@/queries/discovery";
import { Spinner } from "@/shared/ui/Spinner";
import { ErrorState } from "@/shared/ui/ErrorState";
import { EmptyState } from "@/shared/ui/EmptyState";
import { FeedCardSkeleton } from "./FeedCardSkeleton";
import { cn } from "@/shared/lib/cn";
import { useInfiniteScroll } from "@/shared/lib/use-infinite-scroll";

const GRID_CLASSES =
  "grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-5";
const SKELETON_COUNT = 10;

export function TopAlbumsPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useTopAlbumsInfiniteQuery();
  const items = data?.pages.flatMap((page) => page.data) ?? [];
  const sentinelRef = useInfiniteScroll({
    hasNextPage: Boolean(hasNextPage),
    isFetchingNextPage,
    fetchNextPage,
  });

  if (isLoading && !data) {
    return (
      <div className="w-full">
        <div className="mb-6">
          <h1 className="text-white text-2xl font-bold flex items-center gap-2">
            <Trophy size={22} className="text-dourado" />
            {t("topAlbums.title")}
          </h1>
          <p className="text-gray-400 text-base mt-1">{t("topAlbums.subtitle")}</p>
        </div>
        <div className={GRID_CLASSES}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <FeedCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return <ErrorState message={t("topAlbums.error")} onRetry={() => refetch()} />;
  }

  if (items.length === 0) {
    return (
      <EmptyState title={t("topAlbums.emptyTitle")} description={t("topAlbums.emptyDescription")} />
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold flex items-center gap-2">
          <Trophy size={22} className="text-dourado" />
          {t("topAlbums.title")}
        </h1>
        <p className="text-gray-400 text-sm mt-1">{t("topAlbums.subtitle")}</p>
      </div>

      <div className={GRID_CLASSES}>
        {items.map((item, index) => {
          const rank = index + 1;
          const isPodium = rank <= 3;

          return (
            <Link
              key={item.albumId}
              to="/album/$albumId"
              params={{ albumId: item.albumId }}
              className="flex flex-col bg-cinza-escuro border border-white/5 rounded-xl hover:border-dourado/30 hover:bg-white/5 transition"
            >
              <div className="relative">
                {item.albumImageUrl ? (
                  <img
                    src={item.albumImageUrl}
                    alt=""
                    className="w-full aspect-square rounded-t-xl object-cover"
                  />
                ) : (
                  <div className="w-full aspect-square rounded-t-xl bg-cinza-medio flex items-center justify-center">
                    <Music size={32} className="text-gray-500" />
                  </div>
                )}
                <span
                  className={cn(
                    "absolute top-1.5 left-1.5 flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                    isPodium ? "bg-dourado text-black" : "bg-black/60 text-white",
                  )}
                >
                  {rank}
                </span>
              </div>
              <div className="p-4 min-w-0">
                <p className="text-white text-lg font-semibold truncate">{item.albumName}</p>
                <p className="text-gray-400 text-sm truncate">{item.albumArtist}</p>
                <div className="flex items-baseline justify-between gap-2 mt-2 min-w-0">
                  <span className="text-gray-500 text-xs truncate">
                    {t("topAlbums.ratingsCount", { count: item.ratingsCount })}
                  </span>
                  <span className="text-dourado font-bold text-2xl shrink-0">
                    {item.averageScore.toFixed(1)}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {hasNextPage && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          {isFetchingNextPage && <Spinner className="h-6 w-6" />}
        </div>
      )}
    </div>
  );
}
