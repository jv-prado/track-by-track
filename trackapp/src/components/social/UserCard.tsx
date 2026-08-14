import { Image, Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { CalendarDays, ListMusic, Music2 } from "lucide-react-native";
import { getInitials } from "@/lib/initials";
import { formatMonthYear } from "@/lib/date";
import { colors } from "@/lib/colors";
import type { UserStatsItem } from "@/queries/discovery";

// Porta 1:1 de src/shared/social/UserCard.tsx (web). Stats vêm de fora
// (`useUsersStatsQuery` na lista) — o card não busca nada.
export function UserCard({
  userId,
  displayName,
  avatarUrl,
  memberSince,
  stats,
  isStatsLoading,
  onNavigate,
}: {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  memberSince?: string;
  stats?: UserStatsItem;
  isStatsLoading?: boolean;
  onNavigate?: () => void;
}) {
  const { t, i18n } = useTranslation();

  return (
    <Link href={`/profile/${userId}`} asChild>
      <Pressable
        onPress={onNavigate}
        className="mb-1 flex-row items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-3"
      >
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} className="h-12 w-12 rounded-full" />
        ) : (
          <View className="h-12 w-12 items-center justify-center rounded-full bg-cinza-medio">
            <Text className="text-base font-semibold text-gray-300">{getInitials(displayName)}</Text>
          </View>
        )}

        <View className="min-w-0 flex-1">
          <Text className="text-sm font-medium text-white" numberOfLines={1}>
            {displayName}
          </Text>

          {memberSince && (
            <View className="mt-0.5 flex-row items-center gap-1">
              <CalendarDays size={11} color={colors.cinzaClaro} />
              <Text className="text-xs text-gray-500">
                {t("user.memberSince", { date: formatMonthYear(memberSince, i18n.language) })}
              </Text>
            </View>
          )}

          {isStatsLoading ? (
            <View className="mt-1.5 h-3 w-32 rounded bg-white/5" />
          ) : (
            <View className="mt-1 flex-row flex-wrap items-center gap-x-3">
              <View className="flex-row items-center gap-1">
                <ListMusic size={11} color={colors.dourado} />
                <Text className="text-xs text-gray-400">
                  <Text className="font-semibold text-white">{stats?.total ?? 0}</Text>{" "}
                  {t("myRankings.statAlbums")}
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Music2 size={11} color={colors.dourado} />
                <Text className="text-xs text-gray-400">
                  <Text className="font-semibold text-white">{stats?.tracksRated ?? 0}</Text>{" "}
                  {t("myRankings.statTracksRated")}
                </Text>
              </View>
            </View>
          )}
        </View>
      </Pressable>
    </Link>
  );
}
