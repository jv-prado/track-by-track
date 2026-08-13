import { useTranslation } from "react-i18next";
import { Home } from "lucide-react";
import { useFeedInfiniteQuery } from "@/queries/discovery";
import { useInfiniteScroll } from "@/shared/lib/use-infinite-scroll";
import { FeedCard } from "./FeedCard";
import { FeedCardSkeleton } from "./FeedCardSkeleton";
import { ErrorState } from "@/shared/ui/ErrorState";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Spinner } from "@/shared/ui/Spinner";

const GRID_CLASSES =
  "grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-5";
const SKELETON_COUNT = 10;

export function FeedPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useFeedInfiniteQuery();
  const sentinelRef = useInfiniteScroll({
    hasNextPage: Boolean(hasNextPage),
    isFetchingNextPage,
    fetchNextPage,
  });

  const items = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold flex items-center gap-2">
          <Home size={22} className="text-dourado" />
          {t("feed.title")}
        </h1>
        <p className="text-gray-400 text-base mt-1">{t("feed.subtitle")}</p>
      </div>

      {isLoading ? (
        <div className={GRID_CLASSES}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <FeedCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message={t("feed.error")} onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title={t("feed.emptyTitle")} description={t("feed.emptyDescription")} />
      ) : (
        <>
          <div className={GRID_CLASSES}>
            {items.map((item) => (
              <FeedCard key={item.id} item={item} variant="grid" />
            ))}
          </div>

          {hasNextPage && (
            <div ref={sentinelRef} className="flex justify-center py-8">
              {isFetchingNextPage && <Spinner className="h-6 w-6" />}
            </div>
          )}
        </>
      )}
    </div>
  );
}
