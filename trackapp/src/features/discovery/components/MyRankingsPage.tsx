import { useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ListMusic, Music2, Search, SlidersHorizontal, X } from "lucide-react-native";
import { useProfileInfiniteQuery, useUserStatsQuery, type ProfileSort } from "@/queries/discovery";
import { useGenresQuery } from "@/queries/album-catalog";
import { useAuthStore } from "@/shared/auth/auth.store";
import { FeedCard } from "./FeedCard";
import { FeedCardSkeleton } from "@/components/ui/FeedCardSkeleton";
import { Input } from "@/components/ui/Input";
import { FilterBottomSheet } from "@/components/discovery/FilterBottomSheet";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { genreLabel } from "@/lib/genreLabel";
import { colors } from "@/lib/colors";

const SKELETON_COUNT = 6;

const SORT_OPTIONS: { value: ProfileSort; label: string }[] = [
  { value: "recent", label: "Mais recentes" },
  { value: "score-desc", label: "Maior nota" },
  { value: "score-asc", label: "Menor nota" },
];

// Porta 1:1 de src/features/discovery/components/MyRankingsPage.tsx (web).
export function MyRankingsPage() {
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.user?.id) ?? "";

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<ProfileSort>("recent");
  const [genre, setGenre] = useState<string | undefined>(undefined);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [genreSheetOpen, setGenreSheetOpen] = useState(false);
  const { data: genres } = useGenresQuery();

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useProfileInfiniteQuery(userId, { search: search || undefined, sort: sortOrder, genre });
  const statsQuery = useUserStatsQuery(userId);
  const items = data?.pages.flatMap((page) => page.data) ?? [];

  const hasActiveFilters = searchInput !== "" || sortOrder !== "recent" || genre !== undefined;
  const clearFilters = () => {
    setSearchInput("");
    setSortOrder("recent");
    setGenre(undefined);
  };

  if (isError) {
    return (
      <View className="flex-1 bg-grafite px-4" style={{ paddingTop: insets.top + 16 }}>
        <ErrorState message="Não foi possível carregar seus rankings." onRetry={() => refetch()} />
      </View>
    );
  }

  if (!isLoading && data && items.length === 0 && !hasActiveFilters) {
    return (
      <View className="flex-1 bg-grafite px-4" style={{ paddingTop: insets.top + 16 }}>
        <EmptyState
          title="Você ainda não avaliou nenhum álbum"
          description="Busca um álbum e comece a rankear."
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-grafite" style={{ paddingTop: insets.top + 16 }}>
      <View className="px-4">
        <View className="mb-6 flex-row items-center gap-2">
          <ListMusic size={22} color={colors.dourado} />
          <Text className="text-xl font-bold text-white">Minhas avaliações</Text>
        </View>

        <View className="mb-6 flex-row gap-3">
          <StatCard
            accent="roxo"
            icon={<ListMusic size={18} color={colors.roxoVivo} />}
            value={statsQuery.data?.total ?? "–"}
            label="Álbuns"
            className="flex-1"
          />
          <StatCard
            accent="roxo"
            icon={<Music2 size={18} color={colors.roxoVivo} />}
            value={statsQuery.data?.tracksRated ?? "–"}
            label="Faixas avaliadas"
            className="flex-1"
          />
        </View>

        <View className="mb-4 flex-row items-center gap-2">
          <Input
            icon={<Search size={16} color={colors.cinzaMedio} />}
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Buscar por álbum ou artista..."
            containerClassName="flex-1"
          />
          <Pressable
            onPress={() => setSortSheetOpen(true)}
            className="h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-cinza-medio/40"
          >
            <SlidersHorizontal size={16} color={colors.cinzaMedio} />
          </Pressable>
        </View>

        {hasActiveFilters && (
          <Pressable onPress={clearFilters} className="mb-3 flex-row items-center gap-1">
            <X size={12} color={colors.cinzaMedio} />
            <Text className="text-xs text-gray-400">Limpar filtros</Text>
          </Pressable>
        )}
      </View>

      {isLoading && !data ? (
        <FlatList
          data={Array.from({ length: SKELETON_COUNT })}
          keyExtractor={(_, i) => String(i)}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 12 }}
          renderItem={() => <FeedCardSkeleton />}
        />
      ) : items.length === 0 ? (
        <View className="px-4">
          <EmptyState
            title="Nada com esses filtros"
            description="Tenta mudar a busca ou limpar os filtros."
            action={
              <Button variant="outline" size="sm" onPress={clearFilters}>
                Limpar filtros
              </Button>
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
          renderItem={({ item }) => <FeedCard item={item} variant="grid" showProgress />}
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
        open={sortSheetOpen}
        onOpenChange={setSortSheetOpen}
        title="Ordenar por"
        value={sortOrder}
        onChange={setSortOrder}
        options={SORT_OPTIONS}
      />

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
