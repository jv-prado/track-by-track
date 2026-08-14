import { useState } from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { Filter, Music, Sparkles } from "lucide-react-native";
import {
  useNewReleasesInfiniteQuery,
  useNewReleasesGenresQuery,
  useTopChartInfiniteQuery,
  useTopChartGenresQuery,
} from "@/queries/album-catalog";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useRotatingLoadingText } from "@/lib/use-rotating-loading-text";
import { FilterBottomSheet } from "@/components/discovery/FilterBottomSheet";
import { genreLabel } from "@/lib/genreLabel";
import { colors } from "@/lib/colors";
import { cn } from "@/lib/cn";

type DiscoverTab = "new-releases" | "top-chart";

interface DiscoverAlbumCard {
  spotifyId: string;
  name: string;
  artist: string;
  imageUrl?: string;
  releaseDate?: string;
}

// Porta 1:1 de src/features/discovery/components/DiscoverPage.tsx (web).
export function DiscoverPage() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const loadingText = useRotatingLoadingText(["discover.loading1", "discover.loading2", "discover.loading3"]);
  const [tab, setTab] = useState<DiscoverTab>("new-releases");
  const [chartGenre, setChartGenre] = useState<string | undefined>(undefined);
  const [releaseGenre, setReleaseGenre] = useState<string | undefined>(undefined);
  const [genreSheetOpen, setGenreSheetOpen] = useState(false);

  const isTopChart = tab === "top-chart";
  const { data: chartGenres } = useTopChartGenresQuery(isTopChart);
  const { data: releaseGenres } = useNewReleasesGenresQuery(!isTopChart);
  const activeGenre = isTopChart ? chartGenre : releaseGenre;
  const setActiveGenre = isTopChart ? setChartGenre : setReleaseGenre;
  const activeGenres = (isTopChart ? chartGenres : releaseGenres) ?? [];

  const newReleases = useNewReleasesInfiniteQuery(releaseGenre, !isTopChart);
  const topChart = useTopChartInfiniteQuery(chartGenre, isTopChart);
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = isTopChart
    ? topChart
    : newReleases;
  const items: DiscoverAlbumCard[] = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <View className="flex-1 bg-grafite" style={{ paddingTop: insets.top + 16 }}>
      <View className="px-4">
        <View className="mb-1 flex-row items-center gap-2">
          <Sparkles size={22} color={colors.dourado} />
          <Text className="text-xl font-bold text-white">{t("discover.title")}</Text>
        </View>
        <Text className="mb-4 text-base text-gray-400">{t("discover.subtitle")}</Text>

        <View className="mb-4 flex-row items-center justify-between gap-3">
          <View className="flex-row gap-1 border-b border-white/10">
            {(
              [
                ["new-releases", "discover.tabNewReleases"],
                ["top-chart", "discover.tabTopChart"],
              ] as const
            ).map(([value, labelKey]) => (
              <Pressable key={value} onPress={() => setTab(value)} className="px-4 py-2">
                <Text
                  className={cn(
                    "text-sm font-semibold",
                    tab === value ? "text-dourado" : "text-gray-400",
                  )}
                >
                  {t(labelKey)}
                </Text>
                {tab === value && <View className="mt-2 h-0.5 rounded-full bg-dourado" />}
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={() => setGenreSheetOpen(true)}
            accessibilityLabel={t("discover.allGenres")}
            className="h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-cinza-medio/40"
          >
            <Filter size={16} color={colors.cinzaMedio} />
          </Pressable>
        </View>
      </View>

      {isLoading && !data && (
        <View className="items-center gap-3 py-8">
          <Spinner size={24} />
          <Text className="text-sm text-gray-400">{t(loadingText)}</Text>
        </View>
      )}

      {isError && (
        <View className="px-4">
          <ErrorState message={t("discover.error")} onRetry={() => refetch()} />
        </View>
      )}

      {data && items.length === 0 && (
        <View className="px-4">
          <EmptyState title={t("discover.emptyTitle")} description={t("discover.emptyDescription")} />
        </View>
      )}

      {data && items.length > 0 && (
        <FlatList
          data={items}
          keyExtractor={(item) => item.spotifyId}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 12, paddingBottom: insets.bottom + 80 }}
          renderItem={({ item }) => {
            const year = item.releaseDate?.slice(0, 4);
            return (
              <Link href={isTopChart ? `/top-albums/${item.spotifyId}` : `/discover/${item.spotifyId}`} asChild>
                <Pressable className="flex-1 rounded-xl border border-white/5 bg-cinza-escuro">
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} className="aspect-square w-full rounded-t-xl bg-cinza-medio" />
                  ) : (
                    <View className="aspect-square w-full items-center justify-center rounded-t-xl bg-cinza-medio">
                      <Music size={32} color="#6b7280" />
                    </View>
                  )}
                  <View className="p-3">
                    <Text className="text-base font-semibold leading-tight text-white" numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text className="text-sm text-gray-400" numberOfLines={1}>
                      {item.artist}
                    </Text>
                    {year && <Text className="mt-2 text-sm text-gray-500">{year}</Text>}
                  </View>
                </Pressable>
              </Link>
            );
          }}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="items-center py-8">
                <Spinner size={24} />
              </View>
            ) : null
          }
        />
      )}

      <FilterBottomSheet
        open={genreSheetOpen}
        onOpenChange={setGenreSheetOpen}
        title={t("discover.allGenres")}
        value={activeGenre}
        onChange={setActiveGenre}
        options={[
          { value: undefined, label: t("discover.allGenres") },
          ...activeGenres.map((g) => ({ value: g, label: genreLabel(g) })),
        ]}
      />
    </View>
  );
}
