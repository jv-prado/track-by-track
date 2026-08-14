import { useState } from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { Filter, Music, Trophy } from "lucide-react-native";
import { useTopAlbumsInfiniteQuery } from "@/queries/discovery";
import { useGenresQuery } from "@/queries/album-catalog";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedCardSkeleton } from "@/components/ui/FeedCardSkeleton";
import { FilterBottomSheet } from "@/components/discovery/FilterBottomSheet";
import { genreLabel } from "@/lib/genreLabel";
import { getScoreColorClasses } from "@/lib/scoreColor";
import { colors } from "@/lib/colors";
import { cn } from "@/lib/cn";

const SKELETON_COUNT = 6;

// Porta 1:1 de src/features/discovery/components/TopAlbumsPage.tsx (web).
export function TopAlbumsPage() {
  const insets = useSafeAreaInsets();
  const [genre, setGenre] = useState<string | undefined>(undefined);
  const [genreSheetOpen, setGenreSheetOpen] = useState(false);
  const { data: genres } = useGenresQuery();
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useTopAlbumsInfiniteQuery(genre);
  const items = data?.pages.flatMap((page) => page.data) ?? [];

  const header = (
    <View className="mb-4 px-4">
      <View className="flex-row items-center gap-2">
        <Trophy size={22} color={colors.dourado} />
        <Text className="text-xl font-bold text-white">Top álbuns</Text>
      </View>
      <View className="mt-1 flex-row items-center justify-between">
        <Text className="text-gray-400">Os melhores avaliados pela comunidade.</Text>
        <Pressable
          onPress={() => setGenreSheetOpen(true)}
          className="h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-cinza-medio/40"
        >
          <Filter size={14} color={colors.cinzaMedio} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-grafite" style={{ paddingTop: insets.top + 16 }}>
      {header}

      {isLoading && !data && (
        <FlatList
          data={Array.from({ length: SKELETON_COUNT })}
          keyExtractor={(_, i) => String(i)}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 12 }}
          renderItem={() => <FeedCardSkeleton />}
        />
      )}

      {isError && (
        <View className="px-4">
          <ErrorState message="Não foi possível carregar." onRetry={() => refetch()} />
        </View>
      )}

      {data && items.length === 0 && (
        <View className="px-4">
          <EmptyState title="Nada por aqui ainda" description="Volta quando tiver mais avaliações." />
        </View>
      )}

      {data && items.length > 0 && (
        <FlatList
          data={items}
          keyExtractor={(item) => item.albumId}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 12, paddingBottom: insets.bottom + 80 }}
          renderItem={({ item, index }) => {
            const rank = index + 1;
            const isPodium = rank <= 3;
            const scoreColor = getScoreColorClasses(item.averageScore, true);

            return (
              <Link href={`/top-albums/${item.albumId}`} asChild>
                <Pressable className="flex-1 rounded-xl border border-white/5 bg-cinza-escuro">
                  <View className="relative">
                    {item.albumImageUrl ? (
                      <Image source={{ uri: item.albumImageUrl }} className="aspect-square w-full rounded-t-xl" />
                    ) : (
                      <View className="aspect-square w-full items-center justify-center rounded-t-xl bg-cinza-medio">
                        <Music size={32} color="#6b7280" />
                      </View>
                    )}
                    <View
                      className={cn(
                        "absolute left-1.5 top-1.5 h-6 w-6 items-center justify-center rounded-full",
                        isPodium ? "bg-dourado" : "bg-black/60",
                      )}
                    >
                      <Text className={cn("text-xs font-bold", isPodium ? "text-black" : "text-white")}>
                        {rank}
                      </Text>
                    </View>
                  </View>
                  <View className="p-4">
                    <Text className="text-base font-semibold text-white" numberOfLines={1}>
                      {item.albumName}
                    </Text>
                    <Text className="text-sm text-gray-400" numberOfLines={1}>
                      {item.albumArtist}
                    </Text>
                    <View className="mt-2 flex-row items-baseline justify-between gap-2">
                      <Text className="text-xs text-gray-500">{item.ratingsCount} avaliações</Text>
                      <Text className={cn("text-xl font-bold", scoreColor.text)}>
                        {item.averageScore.toFixed(1)}
                      </Text>
                    </View>
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
        title="Todos os gêneros"
        value={genre}
        onChange={setGenre}
        options={[
          { value: undefined, label: "Todos os gêneros" },
          ...(genres ?? []).map((g) => ({ value: g, label: genreLabel(g) })),
        ]}
      />
    </View>
  );
}
