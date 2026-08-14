import { useEffect, useState } from "react";
import { Image, Linking, ScrollView, Share, Text, View } from "react-native";
import { router } from "expo-router";
import {
  Music,
  Pencil,
  ArrowLeft,
  Share2,
  Eye,
  EyeOff,
  ListMusic,
} from "lucide-react-native";
import { useAlbumDetailQuery } from "@/queries/album-catalog";
import {
  useMyRankingForAlbumQuery,
  useCreateOrGetRankingMutation,
  useRateTrackMutation,
  useSetTrackIgnoredMutation,
} from "@/queries/ranking";
import { useAlbumStatsQuery } from "@/queries/discovery";
import { StarRating } from "./StarRating";
import { ReviewForm } from "./ReviewForm";
import { FavoriteWorstPicker } from "./FavoriteWorstPicker";
import { RankingActions } from "./RankingActions";
import { AlbumStatsSection } from "./AlbumStatsSection";
import { AlbumReviewsList } from "./AlbumReviewsList";
import { AlbumHeaderSkeleton, TrackRowSkeleton, TRACK_SKELETON_COUNT } from "./AlbumHeaderSkeleton";
import { TrackPreviewCell } from "./TrackPreviewCell";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { toast } from "@/components/ui/toast-store";
import { useAuthStore } from "@/shared/auth/auth.store";
import { getScoreColorClasses } from "@/lib/scoreColor";
import { buildYoutubeMusicSearchUrl } from "@/lib/youtube";
import { buildAppleMusicSearchUrl } from "@/lib/appleMusic";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/cn";
import { useTrackPreviewPlayer } from "@/lib/use-track-preview-player";
import { useRotatingLoadingText } from "@/lib/use-rotating-loading-text";
import { colors } from "@/lib/colors";

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Porta 1:1 de src/shared/album/AlbumRatingView.tsx (web) — o coração do
 * produto (ver trackapp/plan.md Fase 4). Layout é sempre a variante "mobile"
 * do web (o real também empilha tudo em coluna única abaixo de `sm:`).
 */
export function AlbumRatingView({ albumId }: { albumId: string }) {
  const currentUser = useAuthStore((s) => s.user);
  const [reviewOpen, setReviewOpen] = useState(false);
  const preview = useTrackPreviewPlayer();
  const loadingText = useRotatingLoadingText(["Buscando dados do álbum...", "Preparando seu ranking..."]);

  const albumQuery = useAlbumDetailQuery(albumId);
  const rankingQuery = useMyRankingForAlbumQuery(albumId);
  const statsQuery = useAlbumStatsQuery(albumId);
  const createOrGetRanking = useCreateOrGetRankingMutation();
  const rateTrack = useRateTrackMutation();
  const setTrackIgnored = useSetTrackIgnoredMutation();

  const shouldCreateRanking =
    !rankingQuery.isLoading && rankingQuery.data === null && !createOrGetRanking.isPending;

  useEffect(() => {
    if (shouldCreateRanking) {
      createOrGetRanking.mutate(albumId, {
        onError: () => toast.error("Não foi possível preparar seu ranking. Tente de novo."),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldCreateRanking, albumId]);

  const handleShare = async (rankingCreatedAt: string) => {
    if (!currentUser) return;
    void rankingCreatedAt;
    const url = `https://trackbytrack.app/profile/${currentUser.id}/album/${albumId}`;
    try {
      await Share.share({ message: url, url });
    } catch {
      toast.error("Não foi possível compartilhar.");
    }
  };

  if (albumQuery.isLoading || rankingQuery.isLoading || createOrGetRanking.isPending) {
    return (
      <ScrollView className="flex-1 bg-grafite" contentContainerClassName="p-4 pt-16">
        <AlbumHeaderSkeleton />
        <View className="flex-row items-center justify-center gap-2 py-4">
          <Spinner size={16} />
          <Text className="text-sm text-gray-400">{loadingText}</Text>
        </View>
        <View className="gap-2 pt-2">
          {Array.from({ length: TRACK_SKELETON_COUNT }).map((_, i) => (
            <TrackRowSkeleton key={i} />
          ))}
        </View>
      </ScrollView>
    );
  }

  if (albumQuery.isError || !albumQuery.data) {
    return (
      <View className="flex-1 items-center justify-center bg-grafite">
        <ErrorState message="Álbum não encontrado." />
      </View>
    );
  }

  const album = albumQuery.data;
  const ranking = rankingQuery.data ?? createOrGetRanking.data;

  const scoreByTrack = new Map(ranking?.entries.map((e) => [e.trackId, e.score]) ?? []);
  const ignoredByTrack = new Map(ranking?.entries.map((e) => [e.trackId, e.ignored]) ?? []);
  const isComplete = ranking?.progress.percentage === 100;
  const scoreColor = getScoreColorClasses(ranking?.averageScore ?? 0, isComplete);

  return (
    <ScrollView className="flex-1 bg-grafite" contentContainerClassName="gap-6 p-4 pt-16 pb-10">
      <View className="flex-row items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/feed"))}
        >
          <View className="flex-row items-center gap-1.5">
            <ArrowLeft size={16} color="#ffffff" />
            <Text className="text-sm font-semibold text-white">Voltar</Text>
          </View>
        </Button>
        {ranking && <RankingActions rankingId={ranking.id} albumId={albumId} variant="compact" />}
      </View>

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
            <Text className="text-xl font-bold text-white" style={{ textAlign: "center" }}>
              {album.name}
            </Text>
            <Text className="text-gray-400">{album.artist}</Text>
          </View>

          <View className="flex-row flex-wrap items-center justify-center gap-2">
            {ranking && (
              <Button onPress={() => setReviewOpen(true)} size="sm" className="bg-blue-600">
                <View className="flex-row items-center gap-1.5">
                  <Pencil size={14} color="#ffffff" />
                  <Text className="text-sm font-semibold text-white">Sua review</Text>
                </View>
              </Button>
            )}
            <Button
              size="sm"
              className="bg-[#1ED760]"
              onPress={() => Linking.openURL(`https://open.spotify.com/album/${album.spotifyId}`)}
            >
              <Text className="text-sm font-bold text-black">Spotify</Text>
            </Button>
            <Button
              size="sm"
              className="bg-[#FF0000]"
              onPress={() => Linking.openURL(buildYoutubeMusicSearchUrl(album.artist, album.name))}
            >
              <Text className="text-sm font-bold text-white">YouTube</Text>
            </Button>
            <Button
              size="sm"
              className="bg-white"
              onPress={() => Linking.openURL(buildAppleMusicSearchUrl(album.artist, album.name))}
            >
              <Text className="text-sm font-bold text-black">Apple Music</Text>
            </Button>
          </View>

          {ranking && (
            <View className="w-full max-w-md gap-4">
              <View className="flex-row flex-wrap items-baseline justify-center gap-2">
                <Text className="text-sm font-medium text-gray-400">Média geral</Text>
                <Text className={cn("text-4xl font-bold leading-none", scoreColor.text)}>
                  {ranking.averageScore.toFixed(1)}
                </Text>
                <Text className="text-lg text-gray-500">/10</Text>
              </View>

              {statsQuery.data && statsQuery.data.ratingsCount > 0 && (
                <View
                  className={cn(
                    "-mt-1 flex-row items-center gap-1.5 self-center rounded-full border px-2.5 py-1",
                    getScoreColorClasses(statsQuery.data.averageScore, true).bg,
                    getScoreColorClasses(statsQuery.data.averageScore, true).border,
                  )}
                >
                  <Text className="text-xs text-gray-400">Comunidade</Text>
                  <Text className={cn("text-sm font-bold", getScoreColorClasses(statsQuery.data.averageScore, true).text)}>
                    {statsQuery.data.averageScore.toFixed(1)}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    ({statsQuery.data.ratingsCount} avaliações)
                  </Text>
                </View>
              )}

              <View>
                <ProgressBar value={ranking.progress.percentage} className="h-3" />
                <View className="mt-1.5 flex-row flex-wrap items-center justify-between gap-x-2">
                  <Text className="text-sm text-gray-400">Progresso da avaliação</Text>
                  <Text className="text-sm text-gray-400">
                    {ranking.progress.rated}/{ranking.progress.total} avaliadas ({ranking.progress.percentage}%)
                    {ranking.progress.ignored > 0 && ` (${ranking.progress.ignored} ignoradas)`}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>

      {ranking && (
        <View className="gap-4">
          <RankingActions rankingId={ranking.id} albumId={albumId} />

          <Card>
            <FavoriteWorstPicker
              rankingId={ranking.id}
              albumId={albumId}
              tracks={album.tracks.filter((track) => !ignoredByTrack.get(track.spotifyId))}
              favoriteTrackId={ranking.review.favoriteTrackId}
              worstTrackId={ranking.review.worstTrackId}
            />
          </Card>

          <AlbumStatsSection albumId={albumId} />
        </View>
      )}

      <View className="gap-6 border-t border-white/5 pt-6">
        <View>
          <View className="mb-3 flex-row items-center gap-2">
            <ListMusic size={16} color={colors.dourado} />
            <Text className="font-semibold text-white">Faixas</Text>
            {ranking && (
              <Text className="text-sm text-gray-500">
                {ranking.progress.rated}/{ranking.progress.total} avaliadas
                {ranking.progress.ignored > 0 && ` (${ranking.progress.ignored} ignoradas)`}
              </Text>
            )}
          </View>

          <View className="gap-2">
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
                  <Text className="w-5 shrink-0 text-center text-sm text-gray-600">{index + 1}</Text>
                  <TrackPreviewCell albumId={album.spotifyId} track={track} preview={preview} />
                  <View className="min-w-0 flex-1">
                    <Text className="text-white">{track.name}</Text>
                    <Text className="text-xs text-gray-500">{formatDuration(track.durationMs)}</Text>
                  </View>
                  <View className="w-full flex-row items-center justify-end gap-2">
                    {isIgnored ? (
                      <Text className="shrink-0 text-xs italic text-gray-500">Ignorada</Text>
                    ) : (
                      <StarRating
                        value={scoreByTrack.get(track.spotifyId) ?? 0}
                        size={22}
                        disabled={!ranking}
                        onChange={(score) => {
                          if (!ranking) return;
                          rateTrack.mutate(
                            { rankingId: ranking.id, trackId: track.spotifyId, score, albumId },
                            { onError: () => toast.error("Não foi possível salvar a nota. Tente de novo.") },
                          );
                        }}
                      />
                    )}
                    {ranking && (
                      <Button
                        variant="ghost"
                        size="sm"
                        accessibilityLabel={isIgnored ? "Voltar a avaliar esta faixa" : "Ignorar faixa"}
                        onPress={() =>
                          setTrackIgnored.mutate(
                            { rankingId: ranking.id, trackId: track.spotifyId, ignored: !isIgnored, albumId },
                            { onError: () => toast.error("Não foi possível atualizar a faixa. Tente de novo.") },
                          )
                        }
                      >
                        {isIgnored ? <Eye size={16} color="#9ca3af" /> : <EyeOff size={16} color="#9ca3af" />}
                      </Button>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View className="gap-4 border-t border-white/5 pt-2">
          <AlbumReviewsList albumId={albumId} />
        </View>
      </View>

      {ranking && (
        <BottomSheet
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          title={
            <View className="flex-row items-center gap-2">
              <Pencil size={16} color={colors.dourado} />
              <Text className="text-base font-semibold text-white">Sua review</Text>
            </View>
          }
          actions={
            <Button variant="ghost" size="sm" onPress={() => handleShare(ranking.createdAt)}>
              <Share2 size={16} color="#9ca3af" />
            </Button>
          }
        >
          <View className="gap-4">
            <View className="gap-3 rounded-lg border border-white/10 p-3">
              <View>
                <Text className="text-gray-500">Primeira avaliação</Text>
                <Text className="text-gray-300">
                  {ranking.progress.rated > 0 ? formatDate(ranking.createdAt, "pt-BR") : "Sem registro"}
                </Text>
              </View>
              <View>
                <Text className="text-gray-500">Última modificação</Text>
                <Text className="text-gray-300">
                  {ranking.progress.rated > 0 ? formatDate(ranking.updatedAt, "pt-BR") : "Sem registro"}
                </Text>
              </View>
            </View>

            <ReviewForm
              rankingId={ranking.id}
              albumId={albumId}
              initialText={ranking.review.text}
              onSaved={() => setReviewOpen(false)}
            />
          </View>
        </BottomSheet>
      )}
    </ScrollView>
  );
}
