import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Filter, Home } from "lucide-react-native";
import { useFeedInfiniteQuery, type FeedScope } from "@/queries/discovery";
import { useGenresQuery } from "@/queries/album-catalog";
import { cn } from "@/lib/cn";
import { genreLabel } from "@/lib/genreLabel";
import { FeedCard } from "./FeedCard";
import { FeedCardSkeleton } from "@/components/ui/FeedCardSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { FilterBottomSheet } from "@/components/discovery/FilterBottomSheet";
import { colors } from "@/lib/colors";

const SKELETON_COUNT = 6;

// Porta 1:1 de src/features/discovery/components/FeedPage.tsx (web). Web
// guarda scope/genre na querystring da rota — mobile usa estado local (sem
// deep link ainda, mesma troca já feita em outras telas).
export function FeedPage() {
  const insets = useSafeAreaInsets();
  const [scope, setScope] = useState<FeedScope>("global");
  const [genre, setGenre] = useState<string | undefined>(undefined);
  const [genreSheetOpen, setGenreSheetOpen] = useState(false);
  const { data: genres } = useGenresQuery();
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useFeedInfiniteQuery(scope, genre);
  const items = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <View className="flex-1 bg-grafite" style={{ paddingTop: insets.top + 16 }}>
      <View className="px-4">
        <View className="mb-4 flex-row items-center gap-2">
          <Home size={22} color={colors.dourado} />
          <Text className="text-xl font-bold text-white">Feed</Text>
        </View>

        <View className="mb-4 flex-row items-center justify-between gap-3 border-b border-white/10">
          <View className="flex-row gap-1">
            {(["global", "following"] as const).map((tab) => (
              <Pressable key={tab} onPress={() => setScope(tab)} className="px-4 py-2">
                <Text className={cn("text-sm font-semibold", scope === tab ? "text-dourado" : "text-gray-400")}>
                  {tab === "global" ? "Global" : "Seguindo"}
                </Text>
                {scope === tab && <View className="mt-2 h-0.5 rounded-full bg-dourado" />}
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={() => setGenreSheetOpen(true)}
            className="mb-2 h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-cinza-medio/40"
          >
            <Filter size={15} color={colors.cinzaMedio} />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <FlatList
          data={Array.from({ length: SKELETON_COUNT })}
          keyExtractor={(_, i) => String(i)}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 12 }}
          renderItem={() => <FeedCardSkeleton />}
        />
      ) : isError ? (
        <View className="px-4">
          <ErrorState message="Não foi possível carregar o feed." onRetry={() => refetch()} />
        </View>
      ) : items.length === 0 ? (
        <View className="px-4">
          <EmptyState
            title={scope === "following" ? "Ninguém pra ver ainda" : "Feed vazio"}
            description={
              scope === "following"
                ? "Siga alguém pra ver as avaliações aqui."
                : "Ainda não tem avaliação pública. Seja o primeiro."
            }
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 12, paddingBottom: insets.bottom + 80 }}
          renderItem={({ item }) => (
            <FeedCard item={item} variant="grid" href={`/feed/${item.userId}/album/${item.albumId}`} />
          )}
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
