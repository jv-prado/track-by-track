import { Link, useParams, useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Ban, Heart, Music, Star } from "lucide-react";
import { useAlbumDetailQuery } from "@/queries/album-catalog";
import { useUserRankingForAlbumQuery } from "@/queries/ranking";
import { useProfileQuery } from "@/queries/discovery";
import { StarRating } from "./StarRating";
import { Spinner } from "@/shared/ui/Spinner";
import { ErrorState } from "@/shared/ui/ErrorState";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { getScoreColorClasses } from "@/shared/lib/scoreColor";
import { getInitials } from "@/shared/lib/initials";
import { formatDate } from "@/shared/lib/date";
import { cn } from "@/shared/lib/cn";

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function UserAlbumRankingPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { usuarioId, albumId } = useParams({
    from: "/_app/perfil/$usuarioId_/album/$albumId",
  });

  const albumQuery = useAlbumDetailQuery(albumId);
  const rankingQuery = useUserRankingForAlbumQuery(usuarioId, albumId);
  // só pra pegar nome/avatar do dono do ranking — a lista em si não é usada aqui.
  const profileQuery = useProfileQuery(usuarioId, { page: 1, perPage: 1 });

  if (albumQuery.isLoading || rankingQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
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
      <div className="relative -mx-6 -mt-6 px-6 pt-6 sm:-mx-10 sm:-mt-10 sm:px-10 sm:pt-10 overflow-hidden bg-gradient-to-b from-roxo-escuro/60 to-transparent">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // se a página foi aberta direto (link compartilhado, nova aba), não há pra onde
            // voltar dentro do app — history.back() vira no-op silencioso nesse caso.
            if (window.history.length > 1) router.history.back();
            else router.navigate({ to: "/" });
          }}
          className="mb-4"
        >
          <ArrowLeft size={16} /> {t("common.back")}
        </Button>

        <div className="pb-4 sm:pb-6 flex flex-col items-center text-center gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:text-left sm:gap-6">
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

            {reviewer && (
              <div className="flex items-center gap-2">
                {reviewer.userAvatarUrl ? (
                  <img
                    src={reviewer.userAvatarUrl}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-cinza-medio flex items-center justify-center shrink-0">
                    <span className="text-gray-300 text-xs font-semibold leading-none">
                      {getInitials(reviewer.userDisplayName)}
                    </span>
                  </div>
                )}
                <div className="text-left">
                  <p className="text-white text-sm font-medium leading-tight">
                    {reviewer.userDisplayName}
                  </p>
                  <p className="text-gray-500 text-xs leading-tight">
                    {t("albumDetail.reviewedOn", { date: formatDate(ranking.updatedAt, i18n.language) })}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-4 w-full max-w-md mx-auto sm:mx-0">
              <div className="flex flex-wrap items-baseline justify-center gap-2 sm:justify-start">
                <span className="text-gray-400 text-sm font-medium">{t("albumDetail.averageScore")}</span>
                <span className={cn("text-5xl sm:text-6xl font-extrabold leading-none", scoreColor.text)}>
                  {ranking.averageScore.toFixed(1)}
                </span>
                <span className="text-gray-500 text-xl">/10</span>
              </div>

              <div>
                <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-roxo-vivo to-dourado rounded-full transition-all"
                    style={{ width: `${ranking.progress.percentage}%` }}
                  />
                </div>
                <p className="text-gray-400 text-sm mt-1.5">
                  {t("albumDetail.ratedPercentage", { percentage: ranking.progress.percentage })}
                </p>
              </div>
            </div>

            <Link to="/album/$albumId" params={{ albumId }}>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-500">
                <Star size={14} /> {t("albumDetail.rateNow")}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="pt-4 sm:pt-6 flex flex-col gap-6">
        {(favoriteTrackName || worstTrackName) && (
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {favoriteTrackName && (
              <Card className="p-3">
                <p className="flex items-center gap-1.5 text-sm font-medium text-red-400 mb-1">
                  <Heart size={14} /> {t("review.favoriteTrack")}
                </p>
                <p className="text-gray-200 text-sm">{favoriteTrackName}</p>
              </Card>
            )}
            {worstTrackName && (
              <Card className="p-3">
                <p className="flex items-center gap-1.5 text-sm font-medium text-gray-400 mb-1">
                  <Ban size={14} /> {t("review.worstTrack")}
                </p>
                <p className="text-gray-200 text-sm">{worstTrackName}</p>
              </Card>
            )}
          </section>
        )}

        {ranking.review.text && (
          <section>
            <h2 className="text-white font-semibold mb-3">{t("albumDetail.reviewHeading")}</h2>
            <Card className="p-4">
              <p className="text-gray-300 text-sm">{ranking.review.text}</p>
            </Card>
          </section>
        )}

        <section>
          <h2 className="text-white font-semibold mb-3">{t("albumDetail.tracks")}</h2>
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
