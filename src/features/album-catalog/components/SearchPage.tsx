import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";
import { useSearchAlbumsInfiniteQuery } from "@/queries/album-catalog";
import { useSearchUsersInfiniteQuery } from "@/queries/follows";
import { useUsersStatsQuery } from "@/queries/discovery";
import { UserCard } from "@/shared/social/UserCard";
import { Input } from "@/shared/ui/Input";
import { Spinner } from "@/shared/ui/Spinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { Skeleton } from "@/shared/ui/Skeleton";
import { useInfiniteScroll } from "@/shared/lib/use-infinite-scroll";
import { cn } from "@/shared/lib/cn";
import { AlbumCard } from "./AlbumCard";
import { FeedCardSkeleton } from "@/shared/ui/FeedCardSkeleton";

// mesma grade do Discover/Feed (ver DiscoverPage.tsx) — cartão idêntico merece mesmo tamanho.
const GRID_CLASSES =
  "grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-5";
const SKELETON_COUNT = 10;

type SearchTab = "albums" | "users";

export function SearchPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<SearchTab>("albums");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");

  // debounce: espera parar de digitar antes de bater na API
  useEffect(() => {
    const timeout = setTimeout(() => setQuery(queryInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [queryInput]);

  const isUsers = tab === "users";
  // cada hook só habilita a própria query quando a aba correspondente está
  // ativa — trocar de aba não deixa as duas requisições em voo ao mesmo tempo.
  const albums = useSearchAlbumsInfiniteQuery(isUsers ? "" : query);
  const users = useSearchUsersInfiniteQuery(isUsers ? query : "");
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = isUsers ? users : albums;
  const sentinelRef = useInfiniteScroll({
    hasNextPage: Boolean(hasNextPage),
    isFetchingNextPage,
    fetchNextPage,
  });

  const albumItems = albums.data?.pages.flatMap((page) => page.data) ?? [];
  const userItems = users.data?.pages.flatMap((page) => page.data) ?? [];
  const userStats = useUsersStatsQuery(userItems.map((user) => user.id));
  const hasResults = isUsers ? userItems.length > 0 : albumItems.length > 0;

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

      {/* mesmo estilo de tab do Discover/Feed — sublinhado, não pill. */}
      <div className="flex gap-1 border-b border-white/10 overflow-x-auto mb-6">
        {(
          [
            ["albums", "search.tabAlbums"],
            ["users", "search.tabUsers"],
          ] as const
        ).map(([value, labelKey]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            aria-current={tab === value ? "page" : undefined}
            className={cn(
              "px-4 py-2 text-sm font-semibold sm:font-bold border-b-2 transition cursor-pointer",
              tab === value
                ? "border-dourado text-dourado"
                : "border-transparent text-gray-400 hover:text-white",
            )}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      <div className="relative mb-6 max-w-sm">
        <Input
          icon={<Search size={16} />}
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          placeholder={t(isUsers ? "search.usersPlaceholder" : "search.placeholder")}
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
        <EmptyState
          title={t("search.startTitle")}
          description={t(isUsers ? "search.usersStartDescription" : "search.startDescription")}
        />
      )}

      {query.trim() && isLoading && !data && isUsers && (
        <div className="flex flex-col gap-1">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-2 py-2">
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      )}

      {query.trim() && isLoading && !data && !isUsers && (
        <div className={GRID_CLASSES}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <FeedCardSkeleton key={i} />
          ))}
        </div>
      )}

      {query.trim() && isError && (
        <ErrorState message={t("search.error")} onRetry={() => refetch()} />
      )}

      {query.trim() && data && !hasResults && (
        <EmptyState
          title={t(isUsers ? "search.usersEmptyTitle" : "search.emptyTitle")}
          description={t("search.emptyDescription")}
        />
      )}

      {query.trim() && data && hasResults && isUsers && (
        <>
          <div className="flex flex-col gap-1">
            {userItems.map((user) => (
              <UserCard
                key={user.id}
                userId={user.id}
                displayName={user.displayName}
                avatarUrl={user.avatarUrl}
                memberSince={user.createdAt}
                stats={userStats.data?.get(user.id)}
                isStatsLoading={userStats.isPending}
              />
            ))}
          </div>

          {hasNextPage && (
            <div ref={sentinelRef} className="flex justify-center py-8">
              {isFetchingNextPage && <Spinner className="h-6 w-6" />}
            </div>
          )}
        </>
      )}

      {query.trim() && data && hasResults && !isUsers && (
        <>
          <div className={GRID_CLASSES}>
            {albumItems.map((album) => (
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
