import { useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react-native";
import { useSearchAlbumsInfiniteQuery } from "@/queries/album-catalog";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FeedCardSkeleton } from "@/components/ui/FeedCardSkeleton";
import { AlbumCard } from "./AlbumCard";
import { colors } from "@/lib/colors";

const SKELETON_COUNT = 10;

/**
 * Porta 1:1 de src/features/album-catalog/components/SearchPage.tsx (web).
 * `FlatList numColumns={2}` no lugar do CSS grid responsivo (RN não tem
 * `grid-cols` variável por breakpoint; 2 colunas é a densidade equivalente
 * pra largura de telefone).
 */
export function SearchPage() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => setQuery(queryInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [queryInput]);

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSearchAlbumsInfiniteQuery(query);
  const items = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <View className="flex-1 bg-grafite" style={{ paddingTop: insets.top + 16 }}>
      <View className="px-4">
        <View className="mb-1 flex-row items-center gap-2">
          <Search size={22} color={colors.dourado} />
          <Text className="text-xl font-bold text-white">{t("search.title")}</Text>
        </View>
        <Text className="mb-6 text-base text-gray-400">{t("search.subtitle")}</Text>

        <View className="relative mb-6">
          <Input
            icon={<Search size={16} color={colors.cinzaMedio} />}
            value={queryInput}
            onChangeText={setQueryInput}
            placeholder={t("search.placeholder")}
            autoFocus
          />
          {queryInput.length > 0 && (
            <Pressable
              onPress={() => setQueryInput("")}
              accessibilityLabel={t("search.clearAria")}
              className="absolute right-3 top-0 bottom-0 justify-center"
            >
              <X size={16} color={colors.cinzaMedio} />
            </Pressable>
          )}
        </View>
      </View>

      {!query.trim() && (
        <View className="px-4">
          <EmptyState title={t("search.startTitle")} description={t("search.startDescription")} />
        </View>
      )}

      {query.trim().length > 0 && isLoading && !data && (
        <FlatList
          data={Array.from({ length: SKELETON_COUNT })}
          keyExtractor={(_, i) => String(i)}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 12 }}
          renderItem={() => <FeedCardSkeleton />}
        />
      )}

      {query.trim().length > 0 && isError && (
        <View className="px-4">
          <ErrorState message={t("search.error")} onRetry={() => refetch()} />
        </View>
      )}

      {query.trim().length > 0 && data && items.length === 0 && (
        <View className="px-4">
          <EmptyState title={t("search.emptyTitle")} description={t("search.emptyDescription")} />
        </View>
      )}

      {query.trim().length > 0 && data && items.length > 0 && (
        <FlatList
          data={items}
          keyExtractor={(item) => item.spotifyId}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 12, paddingBottom: insets.bottom + 80 }}
          renderItem={({ item }) => <AlbumCard album={item} />}
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
    </View>
  );
}
