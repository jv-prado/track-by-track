import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Trophy, ChevronRight } from "lucide-react-native";
import { useAlbumStatsQuery } from "@/queries/discovery";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { colors } from "@/lib/colors";

// Porta 1:1 de src/shared/album/AlbumStatsSection.tsx (web).
export function AlbumStatsSection({ albumId }: { albumId: string }) {
  const { t } = useTranslation();
  const { data, isLoading } = useAlbumStatsQuery(albumId);
  const [open, setOpen] = useState(false);

  if (isLoading || !data || data.ratingsCount === 0) return null;

  const ratingsAndAverage = t("communityStats.ratingsAndAverage", {
    count: data.ratingsCount,
    average: data.averageScore.toFixed(1),
  });

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="rounded-xl border border-white/10 bg-cinza-escuro p-4"
      >
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-1.5">
            <Trophy size={14} color={colors.dourado} />
            <Text className="text-sm font-medium text-gray-300">{t("communityStats.title")}</Text>
          </View>
          <ChevronRight size={16} color="#6b7280" />
        </View>
        <Text className="mt-1 text-xs text-gray-500">{ratingsAndAverage}</Text>
      </Pressable>

      <BottomSheet open={open} onOpenChange={setOpen} title={t("communityStats.title")}>
        <View className="gap-4">
          <Text className="text-xs text-gray-500">{ratingsAndAverage}</Text>

          <View>
            <Text className="mb-1 text-xs text-gray-400">{t("communityStats.favoriteTracks")}</Text>
            {data.topFavoriteTracks.map((track, i) => (
              <Text key={track.trackId} className="text-sm text-gray-200">
                {i + 1}. {track.trackName} <Text className="text-gray-500">({track.percentage}%)</Text>
              </Text>
            ))}
          </View>
          <View>
            <Text className="mb-1 text-xs text-gray-400">{t("communityStats.worstTracks")}</Text>
            {data.topWorstTracks.map((track, i) => (
              <Text key={track.trackId} className="text-sm text-gray-200">
                {i + 1}. {track.trackName} <Text className="text-gray-500">({track.percentage}%)</Text>
              </Text>
            ))}
          </View>
        </View>
      </BottomSheet>
    </>
  );
}
