import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";
import { useSearchAlbumsInfiniteQuery } from "@/queries/album-catalog";
import { Input } from "@/shared/ui/Input";
import { Spinner } from "@/shared/ui/Spinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { useInfiniteScroll } from "@/shared/lib/use-infinite-scroll";
import { AlbumCard } from "./AlbumCard";

// mesma grade do Discover/Feed (ver DiscoverPage.tsx) — cartão idêntico merece mesmo tamanho.
const GRID_CLASSES =
  "grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-5";

export function SearchPage() {
  const { t } = useTranslation();
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");

  // debounce: espera parar de digitar antes de bater na API
  useEffect(() => {
    const timeout = setTimeout(() => setQuery(queryInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [queryInput]);

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSearchAlbumsInfiniteQuery(query);
  const items = data?.pages.flatMap((page) => page.data) ?? [];
  const sentinelRef = useInfiniteScroll({
    hasNextPage: Boolean(hasNextPage),
    isFetchingNextPage,
    fetchNextPage,
  });

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-white text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Search size={22} className="text-dourado" />
            {t("search.title")}
          </h1>
          <p className="text-gray-400 text-base mt-1">{t("search.subtitle")}</p>
        </div>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Input
          icon={<Search size={16} />}
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          placeholder={t("search.placeholder")}
          autoFocus
        />
        {queryInput && (
          <button
            onClick={() => setQueryInput("")}
            aria-label={t("search.clearAria")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-dourado cursor-pointer"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {!query.trim() && (
        <EmptyState title={t("search.startTitle")} description={t("search.startDescription")} />
      )}

      {query.trim() && isLoading && !data && (
        <div className="flex justify-center py-8">
          <Spinner className="h-6 w-6" />
        </div>
      )}

      {query.trim() && isError && (
        <ErrorState message={t("search.error")} onRetry={() => refetch()} />
      )}

      {query.trim() && data && items.length === 0 && (
        <EmptyState title={t("search.emptyTitle")} description={t("search.emptyDescription")} />
      )}

      {query.trim() && data && items.length > 0 && (
        <>
          <div className={GRID_CLASSES}>
            {items.map((album) => (
              <AlbumCard key={album.spotifyId} album={album} />
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
