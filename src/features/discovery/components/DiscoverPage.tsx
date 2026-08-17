import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, Check, Filter, Minus, Music, Sparkles } from "lucide-react";
import {
  useNewReleasesInfiniteQuery,
  useNewReleasesGenresQuery,
  useTopChartInfiniteQuery,
  useTopChartGenresQuery,
} from "@/queries/album-catalog";
import { useBillboardChartInfiniteQuery } from "@/queries/charts";
import type { BillboardChartAlbum, TopChartAlbum } from "@/shared/api/types";
import { Spinner } from "@/shared/ui/Spinner";
import { ErrorState } from "@/shared/ui/ErrorState";
import { EmptyState } from "@/shared/ui/EmptyState";
import { useInfiniteScroll } from "@/shared/lib/use-infinite-scroll";
import { useRotatingLoadingText } from "@/shared/lib/use-rotating-loading-text";
import { getScoreColorClasses } from "@/shared/lib/scoreColor";
import { GenreFilter } from "@/shared/ui/GenreFilter";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { genreLabel } from "@/shared/lib/genreLabel";
import { cn } from "@/shared/lib/cn";

// mesma grade do Feed/Top Álbuns (FeedPage.tsx) — cartão idêntico merece mesmo tamanho.
const GRID_CLASSES =
  "grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-5";

type DiscoverTab = "new-releases" | "top-chart" | "billboard-200";

/** Campos que o cartão da grade precisa (só Lançamentos usa grade agora). */
interface DiscoverAlbumCard {
  spotifyId: string;
  name: string;
  artist: string;
  imageUrl?: string;
  releaseDate?: string;
}

/** Mantém a primeira ocorrência — `flatMap` de páginas por offset pode repetir item entre fetches. */
function dedupeById<T>(items: T[], getId: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = getId(item);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
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
  // "Hip-Hop/Rap", os lançamentos vêm nas categorias curadas ("hip-hop"). O
  // Billboard não tem gênero por item (a fonte não manda isso), então não
  // entra nesse par — a aba simplesmente não mostra o filtro.
  const [chartGenre, setChartGenre] = useState<string | undefined>(undefined);
  const [releaseGenre, setReleaseGenre] = useState<string | undefined>(undefined);
  const [genreSheetOpen, setGenreSheetOpen] = useState(false);

  const isTopChart = tab === "top-chart";
  const isBillboard = tab === "billboard-200";
  const { data: chartGenres } = useTopChartGenresQuery(isTopChart);
  const { data: releaseGenres } = useNewReleasesGenresQuery(tab === "new-releases");
  // vocabulários diferentes por aba: o chart usa os gêneros da Apple
  // ("Hip-Hop/Rap"), os lançamentos usam as categorias curadas. Os dois já
  // chegam do servidor ordenados por quantidade de álbuns.
  const activeGenre = isTopChart ? chartGenre : releaseGenre;
  const setActiveGenre = isTopChart ? setChartGenre : setReleaseGenre;
  const activeGenres = (isTopChart ? chartGenres : releaseGenres) ?? [];

  const newReleases = useNewReleasesInfiniteQuery(releaseGenre, tab === "new-releases");
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    newReleases;
  // Paginação por offset (não cursor) num chart/lançamentos que pode reordenar
  // entre fetches (TTL do backend expira, ou o usuário troca de gênero e volta)
  // deixa a mesma faixa cair em duas páginas — dedupe evita `key` repetida.
  const items: DiscoverAlbumCard[] = dedupeById(
    data?.pages.flatMap((page) => page.data) ?? [],
    (album) => album.spotifyId,
  );
  const sentinelRef = useInfiniteScroll({
    hasNextPage: Boolean(hasNextPage),
    isFetchingNextPage,
    fetchNextPage,
  });

  // Top Chart da Apple também tem posição (rank vem da união das lojas, ver
  // apple-top-albums.service.ts) — mesma lista ranqueada do Billboard, não grid.
  const topChart = useTopChartInfiniteQuery(chartGenre, isTopChart);
  const {
    data: topChartData,
    isLoading: isTopChartLoading,
    isError: isTopChartError,
    refetch: refetchTopChart,
    fetchNextPage: fetchNextTopChartPage,
    hasNextPage: hasNextTopChartPage,
    isFetchingNextPage: isFetchingNextTopChartPage,
  } = topChart;
  const topChartItems = dedupeById(
    topChartData?.pages.flatMap((page) => page.data) ?? [],
    (album) => album.spotifyId,
  );
  const topChartSentinelRef = useInfiniteScroll({
    hasNextPage: Boolean(hasNextTopChartPage),
    isFetchingNextPage: isFetchingNextTopChartPage,
    fetchNextPage: fetchNextTopChartPage,
  });

  // Billboard tem seu próprio layout (lista ranqueada, não grid) e sua própria
  // fonte de dados — separado do par acima em vez de forçado num `active`
  // polimórfico, que perderia o tipo de cada item.
  const billboard = useBillboardChartInfiniteQuery(isBillboard);
  const {
    data: billboardData,
    isLoading: isBillboardLoading,
    isError: isBillboardError,
    refetch: refetchBillboard,
    fetchNextPage: fetchNextBillboardPage,
    hasNextPage: hasNextBillboardPage,
    isFetchingNextPage: isFetchingNextBillboardPage,
  } = billboard;
  const billboardItems = dedupeById(
    billboardData?.pages.flatMap((page) => page.data) ?? [],
    // `rank`, não `albumId`: item não resolvido tem `albumId: null` — várias
    // linhas com a mesma key `null` colidiriam no dedupe.
    (album) => String(album.rank),
  );
  const billboardSentinelRef = useInfiniteScroll({
    hasNextPage: Boolean(hasNextBillboardPage),
    isFetchingNextPage: isFetchingNextBillboardPage,
    fetchNextPage: fetchNextBillboardPage,
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
              ["billboard-200", "discover.tabBillboard200"],
            ] as const
          ).map(([value, labelKey]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              aria-current={tab === value ? "page" : undefined}
              className={cn(
                "px-4 py-2 text-sm font-semibold sm:font-bold border-b-2 transition cursor-pointer whitespace-nowrap",
                tab === value
                  ? "border-dourado text-dourado"
                  : "border-transparent text-gray-400 hover:text-white",
              )}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>

        {!isBillboard && (
          <>
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
          </>
        )}
      </div>

      {isBillboard ? (
        <>
          {isBillboardLoading && !billboardData && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Spinner className="h-6 w-6" />
              <p key={loadingText} className="text-gray-400 text-sm">
                {t(loadingText)}
              </p>
            </div>
          )}

          {isBillboardError && (
            <ErrorState message={t("discover.error")} onRetry={() => refetchBillboard()} />
          )}

          {billboardData && billboardItems.length === 0 && (
            <EmptyState title={t("discover.emptyTitle")} description={t("discover.emptyDescription")} />
          )}

          {billboardData && billboardItems.length > 0 && (
            <>
              <ol className="flex flex-col gap-1.5">
                {billboardItems.map((album) => (
                  // `rank`, não `albumId`: item não resolvido tem `albumId: null` —
                  // várias linhas com a mesma key `null` duplicariam/sumiriam no React.
                  <BillboardRow key={album.rank} album={album} />
                ))}
              </ol>

              {hasNextBillboardPage && (
                <div ref={billboardSentinelRef} className="flex justify-center py-8">
                  {isFetchingNextBillboardPage && <Spinner className="h-6 w-6" />}
                </div>
              )}
            </>
          )}
        </>
      ) : isTopChart ? (
        <>
          {isTopChartLoading && !topChartData && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Spinner className="h-6 w-6" />
              <p key={loadingText} className="text-gray-400 text-sm">
                {t(loadingText)}
              </p>
            </div>
          )}

          {isTopChartError && (
            <ErrorState message={t("discover.error")} onRetry={() => refetchTopChart()} />
          )}

          {topChartData && topChartItems.length === 0 && (
            <EmptyState title={t("discover.emptyTitle")} description={t("discover.emptyDescription")} />
          )}

          {topChartData && topChartItems.length > 0 && (
            <>
              <ol className="flex flex-col gap-1.5">
                {topChartItems.map((album) => (
                  <TopChartRow key={album.spotifyId} album={album} />
                ))}
              </ol>

              {hasNextTopChartPage && (
                <div ref={topChartSentinelRef} className="flex justify-center py-8">
                  {isFetchingNextTopChartPage && <Spinner className="h-6 w-6" />}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <>
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

/**
 * Uma linha do ranking do Billboard 200. Item `unresolved` (sem `albumId` —
 * a resolução pro catálogo não achou candidato confiável, spec §27) ainda é
 * mostrado com o que a fonte já manda (nome/artista/capa/posição): vira
 * `<div>` em vez de `<Link>` (não há pra onde navegar) e "Indisponível" no
 * lugar da nota do TBT (não há álbum pra ter nota).
 */
function BillboardRow({ album }: { album: BillboardChartAlbum }) {
  const { t } = useTranslation();
  // `lastWeekRank` vem sempre preenchido na fonte, mesmo em estreia real
  // (bug conhecido do billboard-json) — `weeksOnChart` é o sinal confiável
  // de "primeira semana", não a ausência de rank anterior.
  const delta =
    album.weeksOnChart === 1 || album.lastWeekRank === undefined
      ? "new"
      : album.lastWeekRank > album.rank
        ? "up"
        : album.lastWeekRank < album.rank
          ? "down"
          : "same";
  const scoreColor =
    album.tbtScore === null ? undefined : getScoreColorClasses(album.tbtScore, true);
  const isResolved = album.status === "resolved" && album.albumId !== null;

  const content = (
    <>
      <span className="w-7 shrink-0 text-center text-lg font-bold text-gray-400 sm:text-xl">
        {album.rank}
      </span>

      {album.albumImageUrl ? (
        <img
          src={album.albumImageUrl}
          alt=""
          decoding="async"
          className="h-12 w-12 shrink-0 rounded-md bg-cinza-medio object-cover sm:h-14 sm:w-14"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-cinza-medio sm:h-14 sm:w-14">
          <Music size={20} className="text-gray-500" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white sm:text-base">{album.albumName}</p>
        <p className="truncate text-xs text-gray-400 sm:text-sm">{album.albumArtist}</p>
      </div>

      <div className="hidden shrink-0 flex-col items-end gap-0.5 text-xs text-gray-500 sm:flex">
        <span>{t("discover.billboard.peak", { rank: album.peakRank ?? album.rank })}</span>
        {album.weeksOnChart !== undefined && (
          <span>{t("discover.billboard.weeks", { count: album.weeksOnChart })}</span>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        {delta === "new" && (
          <span className="text-[11px] font-semibold text-verde-destaque">{t("discover.billboard.new")}</span>
        )}
        {delta === "up" && album.lastWeekRank !== undefined && (
          <span className="flex items-center gap-0.5 text-[11px] font-semibold text-verde-destaque">
            <ArrowUp size={12} />
            {album.lastWeekRank - album.rank}
          </span>
        )}
        {delta === "down" && album.lastWeekRank !== undefined && (
          <span className="flex items-center gap-0.5 text-[11px] font-semibold text-red-400">
            <ArrowDown size={12} />
            {album.rank - album.lastWeekRank}
          </span>
        )}
        {delta === "same" && <Minus size={12} className="text-gray-500" />}

        {isResolved ? (
          <span className={cn("text-sm font-bold", scoreColor ? scoreColor.text : "text-gray-500")}>
            {album.tbtScore === null ? "—" : album.tbtScore.toFixed(1)}
          </span>
        ) : (
          <span className="text-[11px] text-gray-500">{t("discover.billboard.unavailable")}</span>
        )}
      </div>
    </>
  );

  if (album.status === "resolved" && album.albumId) {
    const albumId = album.albumId; // narrowed pra string aqui — evita cast na prop do Link
    return (
      <li>
        <Link
          to="/discover/$albumId"
          params={{ albumId }}
          className="flex items-center gap-3 rounded-xl border border-white/5 bg-cinza-escuro p-2.5 hover:border-dourado/30 hover:bg-white/5 transition sm:p-3"
        >
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-cinza-escuro/60 p-2.5 opacity-80 sm:p-3">
        {content}
      </div>
    </li>
  );
}

/**
 * Uma linha do Top Chart da Apple — tem posição (rank vem da união das lojas,
 * ver apple-top-albums.service.ts), então é lista ranqueada igual o Billboard,
 * não grade. Mais simples que `BillboardRow`: sem histórico semanal (a fonte
 * não dá rank da semana passada), sempre resolvido (item sem spotifyId já é
 * descartado no backend, nunca chega aqui) — sempre clicável.
 */
function TopChartRow({ album }: { album: TopChartAlbum }) {
  return (
    <li>
      <Link
        to="/discover/$albumId"
        params={{ albumId: album.spotifyId }}
        className="flex items-center gap-3 rounded-xl border border-white/5 bg-cinza-escuro p-2.5 hover:border-dourado/30 hover:bg-white/5 transition sm:p-3"
      >
        <span className="w-7 shrink-0 text-center text-lg font-bold text-gray-400 sm:text-xl">
          {album.rank}
        </span>

        {album.imageUrl ? (
          <img
            src={album.imageUrl}
            alt=""
            decoding="async"
            className="h-12 w-12 shrink-0 rounded-md bg-cinza-medio object-cover sm:h-14 sm:w-14"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-cinza-medio sm:h-14 sm:w-14">
            <Music size={20} className="text-gray-500" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white sm:text-base">{album.name}</p>
          <p className="truncate text-xs text-gray-400 sm:text-sm">{album.artist}</p>
        </div>

        {album.genres[0] && (
          <span className="hidden shrink-0 text-xs text-gray-500 sm:block">{album.genres[0]}</span>
        )}
      </Link>
    </li>
  );
}
