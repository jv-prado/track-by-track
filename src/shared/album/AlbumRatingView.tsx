import { useEffect, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Music, Pencil, ArrowLeft, Share2, Eye, EyeOff, ListMusic } from "lucide-react";
import { useAlbumDetailQuery } from "@/queries/album-catalog";
import {
  useMyRankingForAlbumQuery,
  useCreateOrGetRankingMutation,
  useRateTrackMutation,
  useSetTrackIgnoredMutation,
} from "@/queries/ranking";
import { useAlbumStatsQuery } from "@/queries/discovery";
import { StarRating } from "@/shared/album/StarRating";
import { ReviewForm } from "@/shared/album/ReviewForm";
import { FavoriteWorstPicker } from "@/shared/album/FavoriteWorstPicker";
import { RankingActions } from "@/shared/album/RankingActions";
import { AlbumStatsSection } from "@/shared/album/AlbumStatsSection";
import { AlbumReviewsList } from "@/shared/album/AlbumReviewsList";
import { AlbumHeaderSkeleton, TrackRowSkeleton, TRACK_SKELETON_COUNT } from "@/shared/album/AlbumHeaderSkeleton";
import { Spinner } from "@/shared/ui/Spinner";
import { ErrorState } from "@/shared/ui/ErrorState";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { ProgressBar } from "@/shared/ui/ProgressBar";
import { toast } from "@/shared/ui/toast-store";
import { useAuthStore } from "@/shared/auth/auth.store";
import { getScoreColorClasses } from "@/shared/lib/scoreColor";
import { buildYoutubeMusicSearchUrl } from "@/shared/lib/youtube";
import { buildAppleMusicSearchUrl } from "@/shared/lib/appleMusic";
import { formatDate } from "@/shared/lib/date";
import { cn } from "@/shared/lib/cn";
import { useTrackPreviewPlayer } from "@/shared/lib/use-track-preview-player";
import { useRotatingLoadingText } from "@/shared/lib/use-rotating-loading-text";
import { TrackPreviewCell } from "./TrackPreviewCell";

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function AlbumRatingView({ albumId }: { albumId: string }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const [reviewOpen, setReviewOpen] = useState(false);
  const preview = useTrackPreviewPlayer();
  // pior caso daqui bate no Spotify (álbum nunca visto) + cria o ranking em sequência — o
  // skeleton sozinho não conta essa segunda etapa, por isso o texto embaixo (ver PLANO-LOADING-STATES.md §3.7).
  const loadingText = useRotatingLoadingText(["albumDetail.loadingAlbum", "albumDetail.loadingRanking"]);

  const handleShare = async () => {
    if (!currentUser) return;
    const url = `${window.location.origin}/profile/${currentUser.id}/album/${albumId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: t("albumDetail.yourReview"), url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success(t("albumDetail.linkCopied"));
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      toast.error(t("albumDetail.shareError"));
    }
  };

  const albumQuery = useAlbumDetailQuery(albumId);
  const rankingQuery = useMyRankingForAlbumQuery(albumId);
  const statsQuery = useAlbumStatsQuery(albumId);
  const createOrGetRanking = useCreateOrGetRankingMutation();
  const rateTrack = useRateTrackMutation();
  const setTrackIgnored = useSetTrackIgnoredMutation();

  const ranking = rankingQuery.data ?? createOrGetRanking.data;

  // Zerar a última nota (sem review) esvazia o ranking no servidor (ver `persistRanking` na
  // API) — o próximo GET 404, e o efeito abaixo recria um ranking vazio na hora. Sem isso,
  // essa recriação silenciosa reacionava o skeleton de página inteira (`createOrGetRanking.isPending`)
  // e derrubava álbum + tracklist já carregados por uma fração de segundo. Uma vez que o
  // usuário já viu um ranking nesta visita, a tela cheia de loading não volta.
  const hadRankingRef = useRef(false);
  useEffect(() => {
    if (ranking) hadRankingRef.current = true;
  }, [ranking]);

  const shouldCreateRanking =
    !rankingQuery.isLoading && rankingQuery.data === null && !createOrGetRanking.isPending;

  useEffect(() => {
    if (shouldCreateRanking) {
      createOrGetRanking.mutate(albumId, {
        onError: () => toast.error(t("albumDetail.createRankingError")),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldCreateRanking, albumId]);

  if (
    albumQuery.isLoading ||
    rankingQuery.isLoading ||
    (createOrGetRanking.isPending && !hadRankingRef.current)
  ) {
    return (
      <div className="w-full">
        <AlbumHeaderSkeleton />

        <div className="flex items-center justify-center gap-2 py-4">
          <Spinner className="h-4 w-4" />
          <p key={loadingText} className="text-gray-400 text-sm">
            {t(loadingText)}
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-2">
          {Array.from({ length: TRACK_SKELETON_COUNT }).map((_, i) => (
            <TrackRowSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (albumQuery.isError || !albumQuery.data) {
    return <ErrorState message={t("albumDetail.notFound")} />;
  }

  const album = albumQuery.data;

  const scoreByTrack = new Map(ranking?.entries.map((e) => [e.trackId, e.score]) ?? []);
  const ignoredByTrack = new Map(ranking?.entries.map((e) => [e.trackId, e.ignored]) ?? []);
  const isComplete = ranking?.progress.percentage === 100;
  const scoreColor = getScoreColorClasses(ranking?.averageScore ?? 0, isComplete);

  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // se a página foi aberta direto (link compartilhado, nova aba), não há pra onde
              // voltar dentro do app — history.back() vira no-op silencioso nesse caso.
              if (window.history.length > 1) router.history.back();
              else router.navigate({ to: "/feed" });
            }}
          >
            <ArrowLeft size={16} /> {t("common.back")}
          </Button>
          {ranking && <RankingActions rankingId={ranking.id} albumId={albumId} variant="compact" />}
        </div>

        <div className="pb-4 sm:pb-6 flex flex-col items-center text-center gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:text-left sm:gap-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6 min-w-0">
              {album.imageUrl ? (
                <img
                  src={album.imageUrl}
                  alt=""
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl object-cover shrink-0 shadow-lg shadow-black/40 ring-1 ring-white/10"
                />
              ) : (
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-cinza-medio flex items-center justify-center shrink-0 ring-1 ring-white/10">
                  <Music size={36} className="text-gray-500" />
                </div>
              )}
              <div className="min-w-0 flex flex-col items-center text-center gap-3 sm:items-start sm:text-left">
              <div>
                <h1 className="text-white text-xl sm:text-3xl font-bold leading-tight">{album.name}</h1>
                <p className="text-gray-400 sm:text-lg">{album.artist}</p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              {ranking && (
                <Button
                  size="sm"
                  onClick={() => setReviewOpen(true)}
                  className="bg-blue-600 hover:bg-blue-500"
                >
                  <Pencil size={14} /> {t("albumDetail.yourReview")}
                </Button>
              )}
              <a
                href={`https://open.spotify.com/album/${album.spotifyId}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("albumDetail.listenSpotify")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1ED760] p-2.5 text-sm font-bold text-black hover:brightness-95 transition sm:px-3 sm:py-1.5"
              >
                <span className="hidden sm:inline">{t("albumDetail.listenSpotify")}</span>
                <img src="/images/logos/spotify.png" alt="" className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              </a>
              <a
                href={buildYoutubeMusicSearchUrl(album.artist, album.name)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("albumDetail.listenYoutube")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF0000] p-2.5 text-sm font-bold text-white hover:brightness-95 transition sm:px-3 sm:py-1.5"
              >
                <span className="hidden sm:inline">{t("albumDetail.listenYoutube")}</span>
                <img src="/images/logos/youtube.png" alt="" className="h-4 w-auto object-contain sm:h-3.5" />
              </a>
              <a
                href={buildAppleMusicSearchUrl(album.artist, album.name)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("albumDetail.listenAppleMusic")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white p-2.5 text-sm font-bold text-black hover:brightness-95 transition sm:px-3 sm:py-1.5"
              >
                <span className="hidden sm:inline">{t("albumDetail.listenAppleMusic")}</span>
                <img src="/images/logos/apple.svg" alt="" className="h-4 w-auto object-contain sm:h-3.5" />
              </a>
              </div>

              {ranking && (
                <div className="flex flex-col gap-4 w-full max-w-md mx-auto sm:mx-0 mt-2 sm:mt-4">
                  <div className="flex flex-wrap items-baseline justify-center gap-2 sm:justify-start">
                    <span className="text-gray-400 text-sm font-medium">{t("albumDetail.averageScore")}</span>
                    <span className={cn("text-4xl sm:text-6xl font-bold sm:font-extrabold leading-none", scoreColor.text)}>
                      {ranking.averageScore.toFixed(1)}
                    </span>
                    <span className="text-gray-500 text-lg sm:text-xl">/10</span>
                  </div>
                  {statsQuery.data ? (
                    statsQuery.data.ratingsCount > 0 ? (
                      <div
                        className={cn(
                          "inline-flex items-center gap-1.5 self-center sm:self-start rounded-full border px-2.5 py-1 -mt-1",
                          getScoreColorClasses(statsQuery.data.averageScore, true).bg,
                          getScoreColorClasses(statsQuery.data.averageScore, true).border,
                        )}
                      >
                        <span className="text-gray-400 text-xs">{t("albumDetail.community")}</span>
                        <span
                          className={cn(
                            "text-sm font-bold",
                            getScoreColorClasses(statsQuery.data.averageScore, true).text,
                          )}
                        >
                          {statsQuery.data.averageScore.toFixed(1)}
                        </span>
                        <span className="text-gray-500 text-xs">
                          ({t("communityStats.ratingsCount", { count: statsQuery.data.ratingsCount })})
                        </span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 self-center sm:self-start rounded-full border border-white/10 bg-white/5 px-2.5 py-1 -mt-1">
                        <span className="text-gray-400 text-xs">{t("albumDetail.community")}</span>
                        <span className="text-gray-500 text-xs italic">{t("albumDetail.communityEmpty")}</span>
                      </div>
                    )
                  ) : (
                    <div className="inline-flex items-center gap-1.5 self-center sm:self-start rounded-full border border-white/10 bg-white/5 px-2.5 py-1 -mt-1 animate-pulse">
                      <span className="text-gray-400 text-xs">{t("albumDetail.community")}</span>
                      <span className="h-3 w-10 rounded bg-white/10" />
                    </div>
                  )}

                  <div>
                    <ProgressBar value={ranking.progress.percentage} className="h-3" />
                    <div className="flex flex-wrap items-center justify-center gap-x-2 mt-1.5 sm:justify-between">
                      <p className="text-gray-400 text-sm">{t("albumDetail.progress")}</p>
                      <p className="text-gray-400 text-sm">
                        {t("albumDetail.ratedOf", {
                          rated: ranking.progress.rated,
                          total: ranking.progress.total,
                        })}{" "}
                        ({ranking.progress.percentage}%)
                        {ranking.progress.ignored > 0 && (
                          <>
                            {" "}
                            {t("albumDetail.ignoredCount", { count: ranking.progress.ignored })}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          {ranking && (
            <div className="flex flex-col gap-4 items-stretch w-full sm:w-96 shrink-0">
              <RankingActions rankingId={ranking.id} albumId={albumId} />

              <Card className="p-4">
                <FavoriteWorstPicker
                  rankingId={ranking.id}
                  albumId={albumId}
                  tracks={album.tracks.filter((track) => !ignoredByTrack.get(track.spotifyId))}
                  favoriteTrackId={ranking.review.favoriteTrackId}
                  worstTrackId={ranking.review.worstTrackId}
                />
              </Card>

              <AlbumStatsSection albumId={albumId} />
            </div>
          )}
        </div>

      <div className="pt-6 sm:pt-8 flex flex-col gap-6">
        <section className="pt-2 border-t border-white/5">
          <h2 className="text-white font-semibold flex items-center gap-2 mb-3">
            <ListMusic size={16} className="text-dourado" /> {t("albumDetail.tracks")}
            {ranking && (
              <span className="text-gray-500 text-sm font-normal ml-2">
                {t("albumDetail.ratedOf", { rated: ranking.progress.rated, total: ranking.progress.total })}
                {ranking.progress.ignored > 0 && (
                  <> {t("albumDetail.ignoredCount", { count: ranking.progress.ignored })}</>
                )}
              </span>
            )}
          </h2>
          <div className="flex flex-col gap-2">
            {album.tracks.map((track, index) => {
              const isIgnored = ignoredByTrack.get(track.spotifyId) ?? false;

              return (
                <div
                  key={track.spotifyId}
                  className={cn(
                    "flex flex-wrap items-center gap-x-3 gap-y-2 bg-cinza-escuro border border-white/5 rounded-xl p-3 hover:border-white/10 transition",
                    isIgnored && "opacity-50",
                  )}
                >
                  <span className="text-gray-600 text-sm w-5 text-center shrink-0">{index + 1}</span>
                  <TrackPreviewCell albumId={album.spotifyId} track={track} preview={preview} />
                  <div className="min-w-0 flex-1">
                    <p className="text-white sm:truncate">{track.name}</p>
                    <p className="text-gray-500 text-xs">{formatDuration(track.durationMs)}</p>
                  </div>
                  <div className="flex items-center gap-2 w-full justify-end sm:w-auto">
                    {isIgnored ? (
                      <span className="text-gray-500 text-xs italic shrink-0">
                        {t("albumDetail.trackIgnored")}
                      </span>
                    ) : (
                      <StarRating
                        value={scoreByTrack.get(track.spotifyId) ?? 0}
                        size={22}
                        // Não desabilitar por `rateTrack.isPending`: isso congelava as 5 estrelas de
                        // TODAS as faixas durante cada request e engolia os cliques seguintes.
                        disabled={!ranking}
                        onChange={(score) => {
                          if (!ranking) return;
                          rateTrack.mutate(
                            { rankingId: ranking.id, trackId: track.spotifyId, score, albumId },
                            { onError: () => toast.error(t("albumDetail.rateError")) },
                          );
                        }}
                      />
                    )}
                    {ranking && (
                      <button
                        type="button"
                        onClick={() =>
                          setTrackIgnored.mutate(
                            {
                              rankingId: ranking.id,
                              trackId: track.spotifyId,
                              ignored: !isIgnored,
                              albumId,
                            },
                            { onError: () => toast.error(t("albumDetail.ignoreError")) },
                          )
                        }
                        title={
                          isIgnored ? t("albumDetail.unignoreTrack") : t("albumDetail.ignoreTrack")
                        }
                        className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-white/10 hover:text-white transition cursor-pointer"
                      >
                        {isIgnored ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-4 pt-2 border-t border-white/5">
          <AlbumReviewsList albumId={albumId} />
        </section>
      </div>

      {ranking && (
        <BottomSheet
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          title={
            <span className="flex items-center gap-2">
              <Pencil size={16} className="text-dourado" /> {t("albumDetail.yourReview")}
            </span>
          }
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShare}
                title={t("albumDetail.share")}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
              >
                <Share2 size={16} />
              </button>
            </div>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 text-sm rounded-lg border border-white/10 p-3">
              <div>
                <p className="text-gray-500">{t("albumDetail.firstRating")}</p>
                <p className="text-gray-300">
                  {ranking.progress.rated > 0
                    ? formatDate(ranking.createdAt, i18n.language)
                    : t("albumDetail.noRecord")}
                </p>
              </div>
              <div>
                <p className="text-gray-500">{t("albumDetail.lastModified")}</p>
                <p className="text-gray-300">
                  {ranking.progress.rated > 0
                    ? formatDate(ranking.updatedAt, i18n.language)
                    : t("albumDetail.noRecord")}
                </p>
              </div>
            </div>

            <ReviewForm
              rankingId={ranking.id}
              albumId={albumId}
              initialText={ranking.review.text}
              onSaved={() => setReviewOpen(false)}
            />
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
