import { useState } from "react";
import { Image, Linking, ScrollView, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ban, Heart, ListMusic, MessageSquare, Music, Star } from "lucide-react-native";
import { useAlbumDetailQuery } from "@/queries/album-catalog";
import { useUserRankingForAlbumQuery } from "@/queries/ranking";
import { useProfileQuery } from "@/queries/discovery";
import { StarRating } from "@/components/album/StarRating";
import { AlbumHeaderSkeleton, TrackRowSkeleton, TRACK_SKELETON_COUNT } from "@/components/album/AlbumHeaderSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { FollowButton } from "@/components/social/FollowButton";
import { TrackPreviewCell } from "@/components/album/TrackPreviewCell";
import { getScoreColorClasses } from "@/lib/scoreColor";
import { getInitials } from "@/lib/initials";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/cn";
import { buildYoutubeMusicSearchUrl } from "@/lib/youtube";
import { buildAppleMusicSearchUrl } from "@/lib/appleMusic";
import { useTrackPreviewPlayer } from "@/lib/use-track-preview-player";
import { colors } from "@/lib/colors";

function ExpandableText({ text }: { text: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Text className="text-sm text-gray-200" numberOfLines={4}>
        {text}
      </Text>
      <Button variant="ghost" size="sm" onPress={() => setOpen(true)} className="mt-1 self-start px-0">
        <Text className="text-xs font-medium text-blue-400">{t("common.showMore")}</Text>
      </Button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title={
          <View className="flex-row items-center gap-2">
            <MessageSquare size={16} color="#60a5fa" />
            <Text className="text-base font-semibold text-white">{t("albumDetail.reviewHeading")}</Text>
          </View>
        }
      >
        <Text className="text-sm text-gray-300">{text}</Text>
      </BottomSheet>
    </View>
  );
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Porta 1:1 de src/features/ranking/components/PublicAlbumRankingView.tsx
 * (web) — visão somente-leitura do ranking de outro usuário.
 */
export function PublicAlbumRankingView({ userId, albumId }: { userId: string; albumId: string }) {
  const { t, i18n } = useTranslation();
  const preview = useTrackPreviewPlayer();

  const albumQuery = useAlbumDetailQuery(albumId);
  const rankingQuery = useUserRankingForAlbumQuery(userId, albumId);
  const profileQuery = useProfileQuery(userId, { page: 1, perPage: 1 });

  if (albumQuery.isLoading || rankingQuery.isLoading) {
    return (
      <ScrollView className="flex-1 bg-grafite" contentContainerClassName="p-4 pt-16">
        <AlbumHeaderSkeleton />
        <View className="gap-2 pt-4">
          {Array.from({ length: TRACK_SKELETON_COUNT }).map((_, i) => (
            <TrackRowSkeleton key={i} />
          ))}
        </View>
      </ScrollView>
    );
  }

  if (albumQuery.isError || !albumQuery.data || rankingQuery.isError || !rankingQuery.data) {
    return (
      <View className="flex-1 items-center justify-center bg-grafite">
        <ErrorState message={t("albumDetail.rankingNotFound")} />
      </View>
    );
  }

  const album = albumQuery.data;
  const ranking = rankingQuery.data;
  const reviewer = profileQuery.data?.data[0];
  const scoreByTrack = new Map(ranking.entries.map((e) => [e.trackId, e.score]));
  const ignoredByTrack = new Map(ranking.entries.map((e) => [e.trackId, e.ignored]));
  const isComplete = ranking.progress.percentage === 100;
  const scoreColor = getScoreColorClasses(ranking.averageScore, isComplete);
  const favoriteTrackName = album.tracks.find((track) => track.spotifyId === ranking.review.favoriteTrackId)?.name;
  const worstTrackName = album.tracks.find((track) => track.spotifyId === ranking.review.worstTrackId)?.name;

  return (
    <ScrollView className="flex-1 bg-grafite" contentContainerClassName="gap-6 p-4 pt-16 pb-10">
      <Button
        variant="ghost"
        size="sm"
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/feed"))}
      >
        <Text className="text-sm font-semibold text-white">{t("common.back")}</Text>
      </Button>

      {reviewer && (
        <View className="flex-row items-center gap-3 border-b border-white/10 pb-4">
          <Link href={`/profile/${userId}`} asChild>
            <View className="min-w-0 flex-1 flex-row items-center gap-3">
              {reviewer.userAvatarUrl ? (
                <Image source={{ uri: reviewer.userAvatarUrl }} className="h-9 w-9 rounded-full" />
              ) : (
                <View className="h-9 w-9 items-center justify-center rounded-full bg-cinza-medio">
                  <Text className="text-xs font-semibold text-gray-300">
                    {getInitials(reviewer.userDisplayName)}
                  </Text>
                </View>
              )}
              <View className="min-w-0">
                <Text className="text-sm text-gray-300">
                  {t("albumDetail.reviewedBy")}{" "}
                  <Text className="font-semibold text-white">{reviewer.userDisplayName}</Text>
                </Text>
                <Text className="text-xs text-gray-500">{formatDate(ranking.updatedAt, i18n.language)}</Text>
              </View>
            </View>
          </Link>
          <FollowButton userId={userId} size="sm" />
        </View>
      )}

      <View className="items-center gap-4">
        {album.imageUrl ? (
          <Image source={{ uri: album.imageUrl }} className="h-28 w-28 rounded-2xl" />
        ) : (
          <View className="h-28 w-28 items-center justify-center rounded-2xl bg-cinza-medio">
            <Music size={36} color="#6b7280" />
          </View>
        )}

        <View className="items-center gap-3">
          <View className="items-center">
            <Text className="text-center text-xl font-bold text-white">{album.name}</Text>
            <Text className="text-gray-400">{album.artist}</Text>
          </View>

          <View className="flex-row flex-wrap items-center justify-center gap-2">
            <Link href={`/album/${albumId}`} asChild>
              <Button size="sm" className="bg-blue-600">
                <View className="flex-row items-center gap-1.5">
                  <Star size={14} color="#ffffff" />
                  <Text className="text-sm font-semibold text-white">{t("albumDetail.rateNow")}</Text>
                </View>
              </Button>
            </Link>
            <Button size="sm" className="bg-[#1ED760]" onPress={() => Linking.openURL(`https://open.spotify.com/album/${album.spotifyId}`)}>
              <Text className="text-sm font-bold text-black">{t("albumDetail.listenSpotify")}</Text>
            </Button>
            <Button size="sm" className="bg-[#FF0000]" onPress={() => Linking.openURL(buildYoutubeMusicSearchUrl(album.artist, album.name))}>
              <Text className="text-sm font-bold text-white">{t("albumDetail.listenYoutube")}</Text>
            </Button>
            <Button size="sm" className="bg-white" onPress={() => Linking.openURL(buildAppleMusicSearchUrl(album.artist, album.name))}>
              <Text className="text-sm font-bold text-black">{t("albumDetail.listenAppleMusic")}</Text>
            </Button>
          </View>

          <View className="w-full max-w-md gap-4">
            <View className="flex-row flex-wrap items-baseline justify-center gap-2">
              <Text className="text-sm font-medium text-gray-400">{t("albumDetail.averageScore")}</Text>
              <Text className={cn("text-4xl font-bold leading-none", scoreColor.text)}>
                {ranking.averageScore.toFixed(1)}
              </Text>
              <Text className="text-lg text-gray-500">/10</Text>
            </View>
            <View>
              <ProgressBar value={ranking.progress.percentage} className="h-3" />
              <Text className="mt-1.5 text-sm text-gray-400">
                {t("albumDetail.ratedPercentage", { percentage: ranking.progress.percentage })}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View className="gap-3">
        <Card>
          <View className="mb-1 flex-row items-center gap-1.5">
            <MessageSquare size={14} color="#60a5fa" />
            <Text className="text-sm font-medium text-blue-400">{t("albumDetail.reviewHeading")}</Text>
          </View>
          {ranking.review.text ? (
            <ExpandableText text={ranking.review.text} />
          ) : (
            <Text className="text-sm text-gray-200">{t("review.notChosen")}</Text>
          )}
        </Card>
        <Card>
          <View className="mb-1 flex-row items-center gap-1.5">
            <Heart size={14} color="#f87171" />
            <Text className="text-sm font-medium text-red-400">{t("review.favoriteTrack")}</Text>
          </View>
          <Text className="text-sm text-gray-200">{favoriteTrackName ?? t("review.notChosen")}</Text>
        </Card>
        <Card>
          <View className="mb-1 flex-row items-center gap-1.5">
            <Ban size={14} color="#9ca3af" />
            <Text className="text-sm font-medium text-gray-400">{t("review.worstTrack")}</Text>
          </View>
          <Text className="text-sm text-gray-200">{worstTrackName ?? t("review.notChosen")}</Text>
        </Card>
      </View>

      <View className="gap-2">
        <View className="mb-1 flex-row items-center gap-2">
          <ListMusic size={16} color={colors.dourado} />
          <Text className="font-semibold text-white">{t("albumDetail.tracks")}</Text>
        </View>
        {album.tracks.map((track, index) => {
          const isIgnored = ignoredByTrack.get(track.spotifyId) ?? false;
          return (
            <View
              key={track.spotifyId}
              className={cn(
                "flex-row flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-white/5 bg-cinza-escuro p-3",
                isIgnored && "opacity-50",
              )}
            >
              <Text className="w-5 text-center text-sm text-gray-600">{index + 1}</Text>
              <TrackPreviewCell albumId={album.spotifyId} track={track} preview={preview} />
              <View className="min-w-0 flex-1">
                <Text className="text-white">{track.name}</Text>
                <Text className="text-xs text-gray-500">{formatDuration(track.durationMs)}</Text>
              </View>
              <View className="w-full flex-row justify-end sm:w-auto">
                {isIgnored ? (
                  <Text className="text-xs italic text-gray-500">{t("albumDetail.trackIgnored")}</Text>
                ) : (
                  <StarRating value={scoreByTrack.get(track.spotifyId) ?? 0} disabled onChange={() => {}} />
                )}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
