import { Image, Pressable, Text, View } from "react-native";
import { Link, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import { Music } from "lucide-react-native";
import type { FeedItem } from "@/shared/api/types";
import type { ViewMode } from "@/components/ui/ViewToggle";
import { cn } from "@/lib/cn";
import { getScoreColorClasses } from "@/lib/scoreColor";
import { getInitials } from "@/lib/initials";
import { ProgressBar } from "@/components/ui/ProgressBar";

/**
 * Porta 1:1 de src/features/discovery/components/FeedCard.tsx (web). `href`
 * troca a rota de destino conforme a origem (Feed/Perfil/Meus Rankings),
 * mesma ideia do `linkTo` do web — mantém a aba certa "ativa" (aqui, dentro
 * do Stack aninhado da tab certa).
 */
export function FeedCard({
  item,
  variant = "list",
  href = `/profile/${item.userId}/album/${item.albumId}`,
  showProgress = false,
}: {
  item: FeedItem;
  variant?: ViewMode;
  href?: string;
  showProgress?: boolean;
}) {
  const { t } = useTranslation();
  const isGrid = variant === "grid";
  const isComplete = item.totalTracks > 0 && item.ratedTracks === item.totalTracks;
  const scoreColor = getScoreColorClasses(item.averageScore, isComplete);
  const progressPct = item.totalTracks > 0 ? Math.round((item.ratedTracks / item.totalTracks) * 100) : 0;

  return (
    <Link href={href as Href} asChild>
      <Pressable
        className={cn(
          "flex-1 rounded-xl border border-white/5 bg-cinza-escuro",
          isGrid ? "flex-col" : "flex-row gap-3 p-3",
        )}
      >
        <View className={cn("relative shrink-0", isGrid ? "w-full aspect-square" : "h-16 w-16")}>
          {item.albumImageUrl ? (
            <Image
              source={{ uri: item.albumImageUrl }}
              className={cn("h-full w-full bg-cinza-medio", isGrid ? "rounded-t-xl" : "rounded-lg")}
            />
          ) : (
            <View
              className={cn(
                "h-full w-full items-center justify-center bg-cinza-medio",
                isGrid ? "rounded-t-xl" : "rounded-lg",
              )}
            >
              <Music size={isGrid ? 32 : 24} color="#6b7280" />
            </View>
          )}
          {item.badge && (
            <View
              className={cn(
                "absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5",
                item.badge === "new" ? "bg-green-500" : "bg-dourado",
              )}
            >
              <Text className="text-[10px] font-semibold leading-none text-grafite">
                {item.badge === "new" ? t("feed.badgeNew") : t("feed.badgeUpdated")}
              </Text>
            </View>
          )}
        </View>

        <View className={cn("min-w-0", isGrid ? "flex-1 p-3" : "flex-1")}>
          <Text
            className={cn("font-semibold text-white", isGrid ? "text-base leading-tight" : "text-base")}
            numberOfLines={isGrid ? 2 : 1}
          >
            {item.albumName}
          </Text>
          <Text className="text-sm text-gray-400" numberOfLines={1}>
            {item.albumArtist}
          </Text>

          <View className={cn("flex-row items-center justify-between gap-2", isGrid ? "mt-auto pt-2" : "mt-2")}>
            <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
              {item.userAvatarUrl ? (
                <Image source={{ uri: item.userAvatarUrl }} className="h-5 w-5 rounded-full" />
              ) : (
                <View className="h-5 w-5 items-center justify-center rounded-full bg-cinza-medio">
                  <Text className="text-[10px] font-semibold leading-none text-gray-300">
                    {getInitials(item.userDisplayName)}
                  </Text>
                </View>
              )}
              <Text className="flex-1 text-sm font-medium text-gray-300" numberOfLines={1}>
                {item.userDisplayName}
              </Text>
            </View>
            <Text className={cn("shrink-0 font-bold", isGrid ? "text-base" : "text-base", scoreColor.text)}>
              {item.averageScore.toFixed(1)}
            </Text>
          </View>

          {showProgress && (
            <View className="mt-2 flex-row items-center gap-1.5">
              <ProgressBar value={progressPct} className="h-1 flex-1" />
              <Text className="shrink-0 text-[11px] text-gray-500">
                {t("common.tracksProgress", { rated: item.ratedTracks, total: item.totalTracks })}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </Link>
  );
}
