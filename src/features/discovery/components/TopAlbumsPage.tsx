import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Check, Filter, Music, Trophy } from "lucide-react";
import { useTopAlbumsInfiniteQuery } from "@/queries/discovery";
import { useGenresQuery } from "@/queries/album-catalog";
import { Spinner } from "@/shared/ui/Spinner";
import { ErrorState } from "@/shared/ui/ErrorState";
import { EmptyState } from "@/shared/ui/EmptyState";
import { FeedCardSkeleton } from "./FeedCardSkeleton";
import { GenreFilter } from "@/shared/ui/GenreFilter";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { genreLabel } from "@/shared/lib/genreLabel";
import { cn } from "@/shared/lib/cn";
import { useInfiniteScroll } from "@/shared/lib/use-infinite-scroll";
import { getScoreColorClasses } from "@/shared/lib/scoreColor";

const GRID_CLASSES =
  "grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-5";
const SKELETON_COUNT = 10;

export function TopAlbumsPage() {
  const { t } = useTranslation();
  const [genre, setGenre] = useState<string | undefined>(undefined);
  const [genreSheetOpen, setGenreSheetOpen] = useState(false);
  // catálogo curado (não os gêneros presentes na página): aqui o filtro roda
  // sobre a coleção inteira de rankings, não sobre a lista já carregada.
  const { data: genres } = useGenresQuery();
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useTopAlbumsInfiniteQuery(genre);
  const items = data?.pages.flatMap((page) => page.data) ?? [];
  const sentinelRef = useInfiniteScroll({
    hasNextPage: Boolean(hasNextPage),
    isFetchingNextPage,
    fetchNextPage,
  });

  const header = (
    <>
      <div className="mb-6">
        <h1 className="text-white text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Trophy size={22} className="text-dourado" />
          {t("topAlbums.title")}
        </h1>

        <div className="flex items-center justify-between gap-3 mt-1">
          <p className="text-gray-400 text-base">{t("topAlbums.subtitle")}</p>

          {/* mobile: ícone abre bottom sheet (mesmo componente do resto do app) */}
          <button
            type="button"
            onClick={() => setGenreSheetOpen(true)}
            aria-label={t("discover.allGenres")}
            className="sm:hidden flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cinza-medio/40 border border-white/10 text-gray-300 hover:text-dourado transition cursor-pointer"
          >
            <Filter size={14} />
          </button>

          {/* sm+: select normal */}
          <GenreFilter value={genre} onChange={setGenre} genres={genres ?? []} className="hidden sm:block shrink-0" />
        </div>
      </div>

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
    </>
  );

  if (isLoading && !data) {
    return (
      <div className="w-full">
        {header}
        <div className={GRID_CLASSES}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <FeedCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full">
        {header}
        <ErrorState message={t("topAlbums.error")} onRetry={() => refetch()} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="w-full">
        {header}
        <EmptyState title={t("topAlbums.emptyTitle")} description={t("topAlbums.emptyDescription")} />
      </div>
    );
  }

  return (
    <div className="w-full">
      {header}

      <div className={GRID_CLASSES}>
        {items.map((item, index) => {
          const rank = index + 1;
          const isPodium = rank <= 3;
          // top albums = média final agregada (não progresso de um ranking em andamento) → sempre "completo"
          const scoreColor = getScoreColorClasses(item.averageScore, true);

          return (
            <Link
              key={item.albumId}
              // rota aninhada em /top-albums — mantém "Top Álbuns" ativo na sidebar.
              to="/top-albums/$albumId"
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
                <p className="text-white text-base sm:text-lg font-semibold truncate">{item.albumName}</p>
                <p className="text-gray-400 text-sm truncate">{item.albumArtist}</p>
                <div className="flex items-baseline justify-between gap-2 mt-2 min-w-0">
                  <span className="text-gray-500 text-xs truncate">
                    {t("topAlbums.ratingsCount", { count: item.ratingsCount })}
                  </span>
                  <span className={cn("font-bold text-xl sm:text-2xl shrink-0", scoreColor.text)}>
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
