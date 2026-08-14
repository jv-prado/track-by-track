import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Ban, Heart, ListMusic, Maximize2, MessageSquare, Music, X } from "lucide-react";
import { useAlbumPreviewQuery } from "@/queries/discovery";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { ProgressBar } from "@/shared/ui/ProgressBar";
import { ErrorState } from "@/shared/ui/ErrorState";
import { Skeleton } from "@/shared/ui/Skeleton";
import { TrackRowSkeleton } from "@/shared/album/AlbumHeaderSkeleton";
import { StarRating } from "@/shared/album/StarRating";
import { TrackPreviewCell } from "@/shared/album/TrackPreviewCell";
import { useTrackPreviewPlayer } from "@/shared/lib/use-track-preview-player";
import { getScoreColorClasses } from "@/shared/lib/scoreColor";
import { formatDate } from "@/shared/lib/date";
import { cn } from "@/shared/lib/cn";

const PREVIEW_TRACK_SKELETON_COUNT = 5;

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Prévia do ranking de um álbum em sheet/drawer — abre a partir de um card de
 * listagem (feed) sem tirar o usuário da página. "Ver completo" no footer é
 * quem de fato navega pra rota cheia (`linkTo`).
 */
export function AlbumPreviewSheet({
  open,
  onOpenChange,
  userId,
  albumId,
  reviewerName,
  linkTo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  albumId: string;
  /** nome de quem avaliou — vira o título da sheet (o nome do álbum já aparece no corpo, repetir seria redundante). */
  reviewerName: string;
  linkTo: "/profile/$userId/album/$albumId" | "/feed/$userId/album/$albumId";
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const preview = useTrackPreviewPlayer();

  // enabled: false enquanto fechada — evita a query disparar em toda troca de
  // item selecionado antes da sheet realmente abrir.
  const previewQuery = useAlbumPreviewQuery(open ? userId : "", open ? albumId : "");

  const album = previewQuery.data?.album;
  const ranking = previewQuery.data?.ranking;
  const isLoading = open && previewQuery.isLoading;
  const isError = previewQuery.isError;

  const handleViewFull = () => {
    onOpenChange(false);
    navigate({ to: linkTo, params: { userId, albumId } });
  };

  const scoreByTrack = new Map((ranking?.entries ?? []).map((e) => [e.trackId, e.score]));
  const ignoredByTrack = new Map((ranking?.entries ?? []).map((e) => [e.trackId, e.ignored]));
  const isComplete = ranking?.progress.percentage === 100;
  const scoreColor = getScoreColorClasses(ranking?.averageScore ?? 0, isComplete ?? false);
  const favoriteTrackName = album?.tracks.find((tr) => tr.spotifyId === ranking?.review.favoriteTrackId)?.name;
  const worstTrackName = album?.tracks.find((tr) => tr.spotifyId === ranking?.review.worstTrackId)?.name;

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex flex-col gap-0.5 min-w-0">
          <span className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-gray-500 font-normal hidden sm:inline shrink-0">
              {t("albumDetail.reviewedBy")}
            </span>
            <span className="truncate">{reviewerName}</span>
          </span>
          {ranking && (
            <span className="text-gray-500 text-xs font-normal truncate">
              {t("albumDetail.reviewedOn", { date: formatDate(ranking.updatedAt, i18n.language) })}
            </span>
          )}
        </span>
      }
      footer={
        <div className="flex justify-between gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            <X size={16} /> {t("common.close")}
          </Button>
          <Button variant="accent" onClick={handleViewFull}>
            <Maximize2 size={16} /> {t("albumDetail.viewFull")}
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-16 h-16 rounded-xl shrink-0" />
            <div className="min-w-0 flex-1 flex flex-col gap-1.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          {Array.from({ length: PREVIEW_TRACK_SKELETON_COUNT }).map((_, i) => (
            <TrackRowSkeleton key={i} />
          ))}
        </div>
      ) : isError || !album || !ranking ? (
        <ErrorState message={t("albumDetail.rankingNotFound")} />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            {album.imageUrl ? (
              <img
                src={album.imageUrl}
                alt=""
                className="w-16 h-16 rounded-xl object-cover shrink-0 ring-1 ring-white/10"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-cinza-medio flex items-center justify-center shrink-0 ring-1 ring-white/10">
                <Music size={22} className="text-gray-500" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-white font-semibold truncate">{album.name}</p>
              <p className="text-gray-400 text-sm truncate">{album.artist}</p>
            </div>
            <span className={cn("text-2xl font-bold shrink-0", scoreColor.text)}>
              {ranking.averageScore.toFixed(1)}
            </span>
          </div>

          <div>
            <ProgressBar value={ranking.progress.percentage} className="h-2" />
            <p className="text-gray-400 text-xs mt-1.5">
              {t("albumDetail.ratedPercentage", { percentage: ranking.progress.percentage })}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Card className="p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium text-blue-400 mb-1">
                <MessageSquare size={14} /> {t("albumDetail.reviewHeading")}
              </p>
              {ranking.review.text ? (
                <p className="text-gray-200 text-sm whitespace-pre-wrap">{ranking.review.text}</p>
              ) : (
                <p className="text-gray-500 text-sm italic">{t("review.noReviewYet")}</p>
              )}
            </Card>
            <div className="grid grid-cols-2 gap-2">
              <Card className="p-3">
                <p className="flex items-center gap-1.5 text-xs font-medium text-red-400 mb-1">
                  <Heart size={12} /> {t("review.favoriteTrack")}
                </p>
                <p className={cn("text-sm truncate", favoriteTrackName ? "text-gray-200" : "text-gray-500 italic")}>
                  {favoriteTrackName ?? t("review.notChosen")}
                </p>
              </Card>
              <Card className="p-3">
                <p className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1">
                  <Ban size={12} /> {t("review.worstTrack")}
                </p>
                <p className={cn("text-sm truncate", worstTrackName ? "text-gray-200" : "text-gray-500 italic")}>
                  {worstTrackName ?? t("review.notChosen")}
                </p>
              </Card>
            </div>
          </div>

          <div>
            <h2 className="text-white font-semibold flex items-center gap-2 mb-3">
              <ListMusic size={16} className="text-dourado" /> {t("albumDetail.tracks")}
            </h2>
            <div className="flex flex-col gap-2">
              {album.tracks.map((track, index) => {
                const isIgnored = ignoredByTrack.get(track.spotifyId) ?? false;

                return (
                  <div
                    key={track.spotifyId}
                    className={cn(
                      "flex flex-wrap items-center gap-x-3 gap-y-2 bg-cinza-escuro border border-white/5 rounded-xl p-3",
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
                        <StarRating value={scoreByTrack.get(track.spotifyId) ?? 0} disabled onChange={() => {}} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
