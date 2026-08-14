import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Check, Filter, Music, Sparkles } from "lucide-react";
import {
  useNewReleasesInfiniteQuery,
  useNewReleasesGenresQuery,
  useTopChartInfiniteQuery,
  useTopChartGenresQuery,
} from "@/queries/album-catalog";
import { Spinner } from "@/shared/ui/Spinner";
import { ErrorState } from "@/shared/ui/ErrorState";
import { EmptyState } from "@/shared/ui/EmptyState";
import { useInfiniteScroll } from "@/shared/lib/use-infinite-scroll";
import { useRotatingLoadingText } from "@/shared/lib/use-rotating-loading-text";
import { GenreFilter } from "@/shared/ui/GenreFilter";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { genreLabel } from "@/shared/lib/genreLabel";
import { cn } from "@/shared/lib/cn";

// mesma grade do Feed/Top Álbuns (FeedPage.tsx) — cartão idêntico merece mesmo tamanho.
const GRID_CLASSES =
  "grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-5";

type DiscoverTab = "new-releases" | "top-chart";

/** Campos que o cartão precisa — `AlbumSummary` e `TopChartAlbum` satisfazem os dois. */
interface DiscoverAlbumCard {
  spotifyId: string;
  name: string;
  artist: string;
  imageUrl?: string;
  releaseDate?: string;
}

export function DiscoverPage() {
  const { t } = useTranslation();
  const loadingText = useRotatingLoadingText([
    "discover.loading1",
    "discover.loading2",
    "discover.loading3",
  ]);
  const [tab, setTab] = useState<DiscoverTab>("new-releases");
  // Um estado por aba: os vocabulários não se conversam — a Apple manda
  // "Hip-Hop/Rap", os lançamentos vêm nas categorias curadas ("hip-hop").
  const [chartGenre, setChartGenre] = useState<string | undefined>(undefined);
  const [releaseGenre, setReleaseGenre] = useState<string | undefined>(undefined);
  const [genreSheetOpen, setGenreSheetOpen] = useState(false);

  const isTopChart = tab === "top-chart";
  const { data: chartGenres } = useTopChartGenresQuery(isTopChart);
  const { data: releaseGenres } = useNewReleasesGenresQuery(!isTopChart);
  // vocabulários diferentes por aba: o chart usa os gêneros da Apple
  // ("Hip-Hop/Rap"), os lançamentos usam as categorias curadas. Os dois já
  // chegam do servidor ordenados por quantidade de álbuns.
  const activeGenre = isTopChart ? chartGenre : releaseGenre;
  const setActiveGenre = isTopChart ? setChartGenre : setReleaseGenre;
  const activeGenres = (isTopChart ? chartGenres : releaseGenres) ?? [];

  const newReleases = useNewReleasesInfiniteQuery(releaseGenre, !isTopChart);
  const topChart = useTopChartInfiniteQuery(chartGenre, isTopChart);
  const active = isTopChart ? topChart : newReleases;

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    active;
  const items: DiscoverAlbumCard[] = data?.pages.flatMap((page) => page.data) ?? [];
  const sentinelRef = useInfiniteScroll({
    hasNextPage: Boolean(hasNextPage),
    isFetchingNextPage,
    fetchNextPage,
  });

  return (
    <div className="w-full">
      <div className="mb-4">
        <h1 className="text-white text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Sparkles size={22} className="text-dourado" />
          {t("discover.title")}
        </h1>
        <p className="text-gray-400 text-base mt-1">{t("discover.subtitle")}</p>
      </div>

      <div className="flex items-center justify-between gap-3 mb-6">
        {/* mesmo estilo de tab do Feed (FeedPage.tsx) — sublinhado, não pill. */}
        <div className="flex gap-1 border-b border-white/10 overflow-x-auto">
          {(
            [
              ["new-releases", "discover.tabNewReleases"],
              ["top-chart", "discover.tabTopChart"],
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
        {/* mobile: ícone abre bottom sheet (mesmo componente do resto do app) */}
        <button
          type="button"
          onClick={() => setGenreSheetOpen(true)}
          aria-label={t("discover.allGenres")}
          className="sm:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cinza-medio/40 border border-white/10 text-gray-300 hover:text-dourado transition cursor-pointer"
        >
          <Filter size={16} />
        </button>

        {/* sm+: select normal */}
        <GenreFilter
          value={activeGenre}
          onChange={setActiveGenre}
          genres={activeGenres}
          className="hidden sm:block shrink-0"
        />
      </div>

      {isLoading && !data && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Spinner className="h-6 w-6" />
          <p key={loadingText} className="text-gray-400 text-sm">
            {t(loadingText)}
          </p>
        </div>
      )}

      {isError && <ErrorState message={t("discover.error")} onRetry={() => refetch()} />}

      {data && items.length === 0 && (
        <EmptyState title={t("discover.emptyTitle")} description={t("discover.emptyDescription")} />
      )}

      {data && items.length > 0 && (
        <>
          <div className={GRID_CLASSES}>
            {items.map((album) => {
              // mesmo cartão do Feed/Pesquisar (ver FeedCard.tsx variant="grid"),
              // sem o rodapé de usuário/nota — aqui é só nome, artista e ano.
              const year = album.releaseDate?.slice(0, 4);
              return (
                <Link
                  key={album.spotifyId}
                  // rota aninhada em /discover — mantém "Descobrir" ativo na sidebar.
                  to="/discover/$albumId"
                  params={{ albumId: album.spotifyId }}
                  className="bg-cinza-escuro border border-white/5 rounded-xl hover:border-dourado/30 hover:bg-white/5 transition flex flex-col"
                >
                  {album.imageUrl ? (
                    <img
                      // Apple manda template 100x100 — já vem trocado por 600x600
                      // no backend (ver apple-top-albums.service.ts).
                      src={album.imageUrl}
                      alt=""
                      decoding="async"
                      className="object-cover shrink-0 bg-cinza-medio w-full aspect-square rounded-t-xl"
                    />
                  ) : (
                    <div className="bg-cinza-medio flex items-center justify-center shrink-0 w-full aspect-square rounded-t-xl">
                      <Music size={32} className="text-gray-500" />
                    </div>
                  )}
                  <div className="min-w-0 p-3 sm:p-4 flex flex-col flex-1">
                    <p className="text-white font-semibold text-base sm:text-lg leading-tight line-clamp-2">
                      {album.name}
                    </p>
                    <p className="text-gray-400 text-sm truncate">{album.artist}</p>
                    {year && <p className="text-gray-500 text-sm mt-auto pt-2">{year}</p>}
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
        </>
      )}

      <BottomSheet open={genreSheetOpen} onOpenChange={setGenreSheetOpen} title={t("discover.allGenres")}>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveGenre(undefined);
              setGenreSheetOpen(false);
            }}
            className={cn(
              "flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-base sm:text-sm transition cursor-pointer",
              activeGenre === undefined ? "bg-dourado/10 text-dourado" : "text-gray-200 hover:bg-white/5",
            )}
          >
            {t("discover.allGenres")}
            {activeGenre === undefined && <Check size={16} />}
          </button>
          {activeGenres.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => {
                setActiveGenre(g);
                setGenreSheetOpen(false);
              }}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-base sm:text-sm transition cursor-pointer",
                activeGenre === g ? "bg-dourado/10 text-dourado" : "text-gray-200 hover:bg-white/5",
              )}
            >
              {genreLabel(g)}
              {activeGenre === g && <Check size={16} />}
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}
