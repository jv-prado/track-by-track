import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Home, Filter, Check } from "lucide-react";
import { useFeedInfiniteQuery } from "@/queries/discovery";
import { useGenresQuery } from "@/queries/album-catalog";
import { cn } from "@/shared/lib/cn";
import { useInfiniteScroll } from "@/shared/lib/use-infinite-scroll";
import { FeedCard } from "./FeedCard";
import { FeedCardSkeleton } from "./FeedCardSkeleton";
import { ErrorState } from "@/shared/ui/ErrorState";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Spinner } from "@/shared/ui/Spinner";
import { GenreFilter } from "@/shared/ui/GenreFilter";
import { genreLabel } from "@/shared/lib/genreLabel";
import { BottomSheet } from "@/shared/ui/BottomSheet";

const GRID_CLASSES =
  "grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-5";
const SKELETON_COUNT = 10;

export function FeedPage() {
  const { t } = useTranslation();
  const { scope, genre } = useSearch({ from: "/_app/feed" });
  const navigate = useNavigate({ from: "/feed" });
  const [genreSheetOpen, setGenreSheetOpen] = useState(false);
  // catálogo curado: mesmo vocabulário do Top Álbuns/Meus Rankings.
  const { data: genres } = useGenresQuery();
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useFeedInfiniteQuery(scope, genre);
  const sentinelRef = useInfiniteScroll({
    hasNextPage: Boolean(hasNextPage),
    isFetchingNextPage,
    fetchNextPage,
  });

  const items = data?.pages.flatMap((page) => page.data) ?? [];
  const setGenre = (next: string | undefined) =>
    navigate({ search: (prev) => ({ ...prev, genre: next }) });

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-white text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Home size={22} className="text-dourado" />
          {t("feed.title")}
        </h1>
        <p className="text-gray-400 text-base mt-1">{t("feed.subtitle")}</p>
      </div>

      <div className="mb-5 flex items-center justify-between gap-3 border-b border-white/10">
        <div className="flex gap-1">
          {(["global", "following"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => navigate({ search: (prev) => ({ ...prev, scope: tab }) })}
              aria-current={scope === tab ? "page" : undefined}
              className={cn(
                "px-4 py-2 text-sm font-semibold sm:font-bold border-b-2 transition cursor-pointer",
                scope === tab
                  ? "border-dourado text-dourado"
                  : "border-transparent text-gray-400 hover:text-white",
              )}
            >
              {t(`feed.tabs.${tab}`)}
            </button>
          ))}
        </div>

        <div className="mb-2 shrink-0">
          {/* mobile: ícone abre bottom sheet, mesmo padrão de MyRankingsPage */}
          <button
            type="button"
            onClick={() => setGenreSheetOpen(true)}
            aria-label={t("discover.allGenres")}
            className={cn(
              "sm:hidden flex h-9 w-9 items-center justify-center rounded-lg border transition cursor-pointer",
              genre
                ? "bg-dourado/10 border-dourado/40 text-dourado"
                : "bg-cinza-medio/40 border-white/10 text-gray-300 hover:text-dourado",
            )}
          >
            <Filter size={15} />
          </button>
          <GenreFilter
            value={genre}
            onChange={setGenre}
            genres={genres ?? []}
            size="sm"
            className="hidden sm:block"
          />
        </div>
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
        // Feed pessoal vazio é informação, não erro: quem não segue ninguém
        // precisa saber o que fazer, não achar que o feed quebrou.
        <EmptyState
          title={t(scope === "following" ? "feed.followingEmptyTitle" : "feed.emptyTitle")}
          description={t(
            scope === "following" ? "feed.followingEmptyDescription" : "feed.emptyDescription",
          )}
        />
      ) : (
        <>
          <div className={GRID_CLASSES}>
            {items.map((item) => (
              <FeedCard
                key={item.id}
                item={item}
                variant="grid"
                linkTo="/feed/$userId/album/$albumId"
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

      <BottomSheet open={genreSheetOpen} onOpenChange={setGenreSheetOpen} title={t("discover.allGenres")}>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => {
              setGenre(undefined);
              setGenreSheetOpen(false);
            }}
            className={cn(
              "flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-base sm:text-sm transition cursor-pointer",
              genre === undefined ? "bg-dourado/10 text-dourado" : "text-gray-200 hover:bg-white/5",
            )}
          >
            {t("discover.allGenres")}
            {genre === undefined && <Check size={16} />}
          </button>
          {(genres ?? []).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => {
                setGenre(g);
                setGenreSheetOpen(false);
              }}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-base sm:text-sm transition cursor-pointer",
                genre === g ? "bg-dourado/10 text-dourado" : "text-gray-200 hover:bg-white/5",
              )}
            >
              {genreLabel(g)}
              {genre === g && <Check size={16} />}
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}
