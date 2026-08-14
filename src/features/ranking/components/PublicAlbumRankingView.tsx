import { useLayoutEffect, useRef, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Ban, Heart, ListMusic, MessageSquare, Music, Star } from "lucide-react";
import { useAlbumDetailQuery } from "@/queries/album-catalog";
import { useUserRankingForAlbumQuery } from "@/queries/ranking";
import { useProfileQuery } from "@/queries/discovery";
import { StarRating } from "@/shared/album/StarRating";
import { AlbumHeaderSkeleton, TrackRowSkeleton, TRACK_SKELETON_COUNT } from "@/shared/album/AlbumHeaderSkeleton";
import { ErrorState } from "@/shared/ui/ErrorState";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { ProgressBar } from "@/shared/ui/ProgressBar";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { getScoreColorClasses } from "@/shared/lib/scoreColor";
import { getInitials } from "@/shared/lib/initials";
import { formatDate } from "@/shared/lib/date";
import { cn } from "@/shared/lib/cn";
import { buildYoutubeMusicSearchUrl } from "@/shared/lib/youtube";
import { buildAppleMusicSearchUrl } from "@/shared/lib/appleMusic";
import { useTrackPreviewPlayer } from "@/shared/lib/use-track-preview-player";
import { TrackPreviewCell } from "@/shared/album/TrackPreviewCell";
import { FollowButton } from "@/shared/social/FollowButton";

function ExpandableText({ text }: { text: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const clampRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const el = clampRef.current;
    if (el) setTruncated(el.scrollHeight > el.clientHeight);
  }, [text]);

  return (
    <div>
      <p ref={clampRef} className="text-gray-200 text-sm whitespace-pre-wrap line-clamp-4">
        {text}
      </p>
      {truncated && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-blue-400 text-xs font-medium mt-1 hover:text-blue-300 transition cursor-pointer"
        >
          {t("common.showMore")}
        </button>
      )}
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title={
          <span className="flex items-center gap-2">
            <MessageSquare size={16} className="text-blue-400" /> {t("albumDetail.reviewHeading")}
          </span>
        }
      >
        <p className="text-gray-300 text-sm whitespace-pre-wrap">{text}</p>
      </BottomSheet>
    </div>
  );
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function PublicAlbumRankingView({ userId, albumId }: { userId: string; albumId: string }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const preview = useTrackPreviewPlayer();

  const albumQuery = useAlbumDetailQuery(albumId);
  const rankingQuery = useUserRankingForAlbumQuery(userId, albumId);
  // só pra pegar nome/avatar do dono do ranking — a lista em si não é usada aqui.
  const profileQuery = useProfileQuery(userId, { page: 1, perPage: 1 });

  if (albumQuery.isLoading || rankingQuery.isLoading) {
    return (
      <div className="w-full">
        {/* sem texto de feedback aqui: sem etapa de criar ranking, e o álbum quase sempre já
            está em cache (alguém rankeou antes de existir uma URL pra essa tela) — ver
            PLANO-LOADING-STATES.md §3.8. */}
        <AlbumHeaderSkeleton showReviewerRow />

        <div className="pt-4 sm:pt-6 flex flex-col gap-2">
          {Array.from({ length: TRACK_SKELETON_COUNT }).map((_, i) => (
            <TrackRowSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (albumQuery.isError || !albumQuery.data || rankingQuery.isError || !rankingQuery.data) {
    return <ErrorState message={t("albumDetail.rankingNotFound")} />;
  }

  const album = albumQuery.data;
  const ranking = rankingQuery.data;
  const reviewer = profileQuery.data?.data[0];
  const scoreByTrack = new Map(ranking.entries.map((e) => [e.trackId, e.score]));
  const ignoredByTrack = new Map(ranking.entries.map((e) => [e.trackId, e.ignored]));
  const isComplete = ranking.progress.percentage === 100;
  const scoreColor = getScoreColorClasses(ranking.averageScore, isComplete);
  const favoriteTrackName = album.tracks.find(
    (track) => track.spotifyId === ranking.review.favoriteTrackId,
  )?.name;
  const worstTrackName = album.tracks.find(
    (track) => track.spotifyId === ranking.review.worstTrackId,
  )?.name;

  return (
    <div className="w-full">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          // se a página foi aberta direto (link compartilhado, nova aba), não há pra onde
          // voltar dentro do app — history.back() vira no-op silencioso nesse caso.
          if (window.history.length > 1) router.history.back();
          else router.navigate({ to: "/feed" });
        }}
        className="mb-4"
      >
        <ArrowLeft size={16} /> {t("common.back")}
      </Button>

      {reviewer && (
          <div className="flex items-center gap-2 mb-5 pb-4 border-b border-white/10 sm:gap-3">
            <Link
              to="/profile/$userId"
              params={{ userId }}
              className="flex flex-1 items-center gap-2 min-w-0 group sm:gap-3"
            >
              {reviewer.userAvatarUrl ? (
                <img
                  src={reviewer.userAvatarUrl}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-white/10"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-cinza-medio flex items-center justify-center shrink-0 ring-1 ring-white/10">
                  <span className="text-gray-300 text-xs font-semibold leading-none">
                    {getInitials(reviewer.userDisplayName)}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm text-gray-300 truncate">
                  <span className="text-gray-500 hidden sm:inline">{t("albumDetail.reviewedBy")} </span>
                  <span className="text-white font-semibold group-hover:underline">
                    {reviewer.userDisplayName}
                  </span>
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {formatDate(ranking.updatedAt, i18n.language)}
                </p>
              </div>
            </Link>
            <FollowButton userId={userId} size="sm" className="shrink-0 px-2.5 sm:px-3" />
          </div>
        )}

        <div className="pb-4 sm:pb-6 flex flex-col items-center text-center gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:text-left sm:gap-6">
          <div className="flex flex-col items-center text-center gap-4 sm:flex-row sm:items-start sm:text-left sm:gap-6 min-w-0">
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
              <Link to="/album/$albumId" params={{ albumId }}>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-500">
                  <Star size={14} /> {t("albumDetail.rateNow")}
                </Button>
              </Link>
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

            <div className="flex flex-col gap-4 w-full max-w-md mx-auto sm:mx-0 mt-2 sm:mt-4">
              <div className="flex flex-wrap items-baseline justify-center gap-2 sm:justify-start">
                <span className="text-gray-400 text-sm font-medium">{t("albumDetail.averageScore")}</span>
                <span className={cn("text-4xl sm:text-6xl font-bold sm:font-extrabold leading-none", scoreColor.text)}>
                  {ranking.averageScore.toFixed(1)}
                </span>
                <span className="text-gray-500 text-lg sm:text-xl">/10</span>
              </div>

              <div>
                <ProgressBar value={ranking.progress.percentage} className="h-3" />
                <p className="text-gray-400 text-sm mt-1.5">
                  {t("albumDetail.ratedPercentage", { percentage: ranking.progress.percentage })}
                </p>
              </div>
            </div>
          </div>
          </div>

          <div className="flex flex-col gap-3 w-full sm:w-96 shrink-0">
            <Card className="p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium text-blue-400 mb-1">
                <MessageSquare size={14} /> {t("albumDetail.reviewHeading")}
              </p>
              {ranking.review.text ? (
                <ExpandableText text={ranking.review.text} />
              ) : (
                <p className="text-gray-200 text-sm">{t("review.noReviewYet")}</p>
              )}
            </Card>
            <Card className="p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium text-red-400 mb-1">
                <Heart size={14} /> {t("review.favoriteTrack")}
              </p>
              <p className="text-gray-200 text-sm">
                {favoriteTrackName ?? t("review.notChosen")}
              </p>
            </Card>
            <Card className="p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium text-gray-400 mb-1">
                <Ban size={14} /> {t("review.worstTrack")}
              </p>
              <p className="text-gray-200 text-sm">
                {worstTrackName ?? t("review.notChosen")}
              </p>
            </Card>
          </div>
        </div>

      <div className="pt-6 sm:pt-8 flex flex-col gap-6">
        <section>
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
        </section>
      </div>
    </div>
  );
}
