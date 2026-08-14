import { useEffect, useState } from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ListMusic, Music2, Search, SlidersHorizontal } from "lucide-react-native";
import { useProfileInfiniteQuery, useUserStatsQuery, type ProfileSort } from "@/queries/discovery";
import { useFollowStatsQuery } from "@/queries/follows";
import { useGenresQuery } from "@/queries/album-catalog";
import { getInitials } from "@/lib/initials";
import { FeedCard } from "./FeedCard";
import { FeedCardSkeleton } from "@/components/ui/FeedCardSkeleton";
import { ProfileHeaderSkeleton } from "./ProfileHeaderSkeleton";
import { FollowButton } from "@/components/social/FollowButton";
import { FollowListModal } from "@/components/social/FollowListModal";
import { FilterBottomSheet } from "@/components/discovery/FilterBottomSheet";
import { genreLabel } from "@/lib/genreLabel";
import { Input } from "@/components/ui/Input";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { colors } from "@/lib/colors";

const SKELETON_COUNT = 6;

// Porta 1:1 de src/features/discovery/components/PublicProfilePage.tsx (web).
export function PublicProfilePage({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<ProfileSort>("recent");
  const [genre, setGenre] = useState<string | undefined>(undefined);
  const [followListKind, setFollowListKind] = useState<"followers" | "following" | null>(null);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [genreSheetOpen, setGenreSheetOpen] = useState(false);
  const { data: genres } = useGenresQuery();

  const sortOptions: { value: ProfileSort; label: string }[] = [
    { value: "recent", label: t("myRankings.sortRecent") },
    { value: "score-desc", label: t("myRankings.sortScoreDesc") },
    { value: "score-asc", label: t("myRankings.sortScoreAsc") },
  ];

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Perfil público só mostra álbum 100% avaliado — mesmo critério do feed
  // global (backend: completedAt). "Meus rankings" continua mostrando
  // rascunho em progresso, por isso não usa completedOnly.
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useProfileInfiniteQuery(userId, {
      search: search || undefined,
      sort: sortOrder,
      genre,
      completedOnly: true,
    });
  const statsQuery = useUserStatsQuery(userId, true);
  const followStats = useFollowStatsQuery(userId);
  const items = data?.pages.flatMap((page) => page.data) ?? [];
  const first = data?.pages[0]?.data[0];

  const hasActiveFilters = searchInput !== "" || sortOrder !== "recent" || genre !== undefined;
  const clearFilters = () => {
    setSearchInput("");
    setSortOrder("recent");
    setGenre(undefined);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-grafite" style={{ paddingTop: insets.top + 16 }}>
        <ProfileHeaderSkeleton />
        <FlatList
          data={Array.from({ length: SKELETON_COUNT })}
          keyExtractor={(_, i) => String(i)}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 12, marginTop: 12 }}
          renderItem={() => <FeedCardSkeleton />}
        />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-grafite px-4" style={{ paddingTop: insets.top + 16 }}>
        <ErrorState message={t("profile.error")} onRetry={() => refetch()} />
      </View>
    );
  }

  if (!first) {
    return (
      <View className="flex-1 bg-grafite px-4" style={{ paddingTop: insets.top + 16 }}>
        <EmptyState title={t("profile.empty")} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-grafite" style={{ paddingTop: insets.top + 16 }}>
      <View className="px-4">
        <Button variant="ghost" size="sm" onPress={() => (router.canGoBack() ? router.back() : router.replace("/feed"))} className="mb-4">
          <View className="flex-row items-center gap-1.5">
            <ArrowLeft size={16} color="#ffffff" />
            <Text className="text-sm font-semibold text-white">{t("common.back")}</Text>
          </View>
        </Button>

        <View className="mb-6 flex-row items-center justify-between gap-4">
          <View className="min-w-0 flex-1 flex-row items-center gap-3">
            {first.userAvatarUrl ? (
              <Image source={{ uri: first.userAvatarUrl }} className="h-14 w-14 rounded-full" />
            ) : (
              <View className="h-14 w-14 items-center justify-center rounded-full bg-cinza-medio">
                <Text className="text-lg font-semibold text-gray-300">{getInitials(first.userDisplayName)}</Text>
              </View>
            )}
            <View className="min-w-0 flex-1">
              <Text className="text-xl font-bold text-white" numberOfLines={1}>
                {first.userDisplayName}
              </Text>
              <View className="flex-row gap-1">
                <Pressable onPress={() => setFollowListKind("followers")}>
                  <Text className="text-sm text-gray-400">
                    {t("follow.followers", { count: followStats.data?.followers ?? 0 })}
                  </Text>
                </Pressable>
                <Text className="text-sm text-gray-400">·</Text>
                <Pressable onPress={() => setFollowListKind("following")}>
                  <Text className="text-sm text-gray-400">
                    {t("follow.followingCount", { count: followStats.data?.following ?? 0 })}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
          <FollowButton userId={userId} />
        </View>

        <View className="mb-6 flex-row gap-3">
          <StatCard
            accent="roxo"
            icon={<ListMusic size={18} color={colors.roxoVivo} />}
            value={statsQuery.data?.total ?? "–"}
            label={t("myRankings.statAlbums")}
            className="flex-1"
          />
          <StatCard
            accent="roxo"
            icon={<Music2 size={18} color={colors.roxoVivo} />}
            value={statsQuery.data?.tracksRated ?? "–"}
            label={t("myRankings.statTracksRated")}
            className="flex-1"
          />
        </View>

        <View className="mb-4 flex-row items-center gap-2">
          <Input
            icon={<Search size={16} color={colors.cinzaMedio} />}
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder={t("myRankings.searchPlaceholder")}
            containerClassName="flex-1"
          />
          <Pressable
            onPress={() => setSortSheetOpen(true)}
            accessibilityLabel={t("myRankings.sortLabel")}
            className="h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-cinza-medio/40"
          >
            <SlidersHorizontal size={16} color={colors.cinzaMedio} />
          </Pressable>
        </View>
      </View>

      {items.length === 0 ? (
        <View className="px-4">
          <EmptyState
            title={t("myRankings.emptyFilterTitle")}
            description={t("myRankings.emptyFilterDescription")}
            action={
              hasActiveFilters ? (
                <Button variant="outline" size="sm" onPress={clearFilters}>
                  {t("common.clearFilters")}
                </Button>
              ) : undefined
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
          renderItem={({ item }) => <FeedCard item={item} variant="grid" />}
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

      <FollowListModal
        userId={userId}
        kind={followListKind}
        onOpenChange={(open) => setFollowListKind(open ? followListKind : null)}
      />

      <FilterBottomSheet
        open={sortSheetOpen}
        onOpenChange={setSortSheetOpen}
        title={t("myRankings.sortLabel")}
        value={sortOrder}
        onChange={setSortOrder}
        options={sortOptions}
      />

      <FilterBottomSheet
        open={genreSheetOpen}
        onOpenChange={setGenreSheetOpen}
        title={t("discover.allGenres")}
        value={genre}
        onChange={setGenre}
        options={[
          { value: undefined, label: t("discover.allGenres") },
          ...(genres ?? []).map((g) => ({ value: g, label: genreLabel(g) })),
        ]}
      />
    </View>
  );
}
