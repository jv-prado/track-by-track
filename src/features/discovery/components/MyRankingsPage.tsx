import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ListMusic, Music2, Search, SlidersHorizontal, X } from "lucide-react";
import { useProfileInfiniteQuery, useUserStatsQuery, type ProfileSort } from "@/queries/discovery";
import { useAuthStore } from "@/shared/auth/auth.store";
import { useInfiniteScroll } from "@/shared/lib/use-infinite-scroll";
import { FeedCard } from "./FeedCard";
import { FeedCardSkeleton } from "./FeedCardSkeleton";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { Sheet } from "@/shared/ui/Sheet";
import { StatCard } from "@/shared/ui/StatCard";
import { Button } from "@/shared/ui/Button";
import { Spinner } from "@/shared/ui/Spinner";
import { ErrorState } from "@/shared/ui/ErrorState";
import { EmptyState } from "@/shared/ui/EmptyState";
import { cn } from "@/shared/lib/cn";

const GRID_CLASSES =
  "grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-5";
const SKELETON_COUNT = 10;

export function MyRankingsPage() {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.user?.id) ?? "";

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<ProfileSort>("recent");
  const [sortSheetOpen, setSortSheetOpen] = useState(false);

  const sortOptions = [
    { value: "recent" as const, label: t("myRankings.sortRecent") },
    { value: "score-desc" as const, label: t("myRankings.sortScoreDesc") },
    { value: "score-asc" as const, label: t("myRankings.sortScoreAsc") },
  ];

  // debounce: espera parar de digitar antes de bater na API
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useProfileInfiniteQuery(userId, { search: search || undefined, sort: sortOrder });
  const statsQuery = useUserStatsQuery(userId);

  const items = (data?.pages.flatMap((page) => page.data) ?? []).filter(
    (item) => item.ratedTracks > 0,
  );
  const sentinelRef = useInfiniteScroll({
    hasNextPage: Boolean(hasNextPage),
    isFetchingNextPage,
    fetchNextPage,
  });

  const hasActiveFilters = searchInput !== "" || sortOrder !== "recent";

  const clearFilters = () => {
    setSearchInput("");
    setSortOrder("recent");
  };

  if (isError) {
    return <ErrorState message={t("myRankings.error")} onRetry={() => refetch()} />;
  }

  if (!isLoading && data && items.length === 0 && !hasActiveFilters) {
    return (
      <EmptyState title={t("myRankings.emptyTitle")} description={t("myRankings.emptyDescription")} />
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold flex items-center gap-2">
            <ListMusic size={22} className="text-dourado" />
            {t("myRankings.title")}
          </h1>
          <p className="text-gray-400 text-base mt-1">{t("myRankings.subtitle")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <StatCard
          accent="roxo"
          icon={<ListMusic size={18} />}
          value={statsQuery.data?.total ?? "–"}
          label={t("myRankings.statAlbums")}
        />
        <StatCard
          accent="roxo"
          icon={<Music2 size={18} />}
          value={statsQuery.data?.tracksRated ?? "–"}
          label={t("myRankings.statTracksRated")}
        />
      </div>

      <div className="mb-4">
        <div className="flex flex-row gap-3">
          <Input
            icon={<Search size={16} />}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("myRankings.searchPlaceholder")}
            containerClassName="w-full sm:w-64"
          />

          {/* mobile: ícone abre bottom sheet */}
          <button
            type="button"
            onClick={() => setSortSheetOpen(true)}
            aria-label={t("myRankings.sortLabel")}
            className="sm:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cinza-medio/40 border border-white/10 text-gray-300 hover:text-dourado transition cursor-pointer"
          >
            <SlidersHorizontal size={16} />
          </button>

          {/* sm+: select normal */}
          <Select
            value={sortOrder}
            onChange={(v) => setSortOrder(v as ProfileSort)}
            className="hidden sm:block sm:w-auto sm:min-w-40 sm:flex-none"
            options={sortOptions}
          />
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="mt-3 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-dourado transition-colors cursor-pointer"
          >
            <X size={12} /> {t("common.clearFilters")}
          </button>
        )}
      </div>

      {isLoading && !data ? (
        <div className={GRID_CLASSES}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <FeedCardSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title={t("myRankings.emptyFilterTitle")}
          description={t("myRankings.emptyFilterDescription")}
          action={
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <SlidersHorizontal size={14} /> {t("common.clearFilters")}
            </Button>
          }
        />
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

      <Sheet open={sortSheetOpen} onOpenChange={setSortSheetOpen} title={t("myRankings.sortLabel")}>
        <div className="flex flex-col gap-1">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setSortOrder(option.value);
                setSortSheetOpen(false);
              }}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition cursor-pointer",
                sortOrder === option.value ? "bg-dourado/10 text-dourado" : "text-gray-200 hover:bg-white/5",
              )}
            >
              {option.label}
              {sortOrder === option.value && <Check size={16} />}
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
