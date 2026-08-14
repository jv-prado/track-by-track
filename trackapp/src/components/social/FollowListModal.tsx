import { FlatList, Image, Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { useFollowersQuery, useFollowingQuery } from "@/queries/follows";
import { getInitials } from "@/lib/initials";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

type FollowListKind = "followers" | "following";

// Porta 1:1 de src/shared/social/FollowListModal.tsx (web).
export function FollowListModal({
  userId,
  kind,
  onOpenChange,
}: {
  userId: string;
  kind: FollowListKind | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const followersQuery = useFollowersQuery(userId);
  const followingQuery = useFollowingQuery(userId);

  const query = kind === "followers" ? followersQuery : followingQuery;
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = query;
  const items = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <Modal
      open={kind !== null}
      onOpenChange={onOpenChange}
      title={kind === "followers" ? t("follow.followersTitle") : t("follow.followingTitle")}
    >
      {isLoading ? (
        <View className="items-center py-8">
          <Spinner size={24} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState title={kind === "followers" ? t("follow.emptyFollowers") : t("follow.emptyFollowing")} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.userId}
          renderItem={({ item }) => (
            <Link href={`/profile/${item.userId}`} asChild>
              <Pressable onPress={() => onOpenChange(false)} className="flex-row items-center gap-3 rounded-lg px-2 py-2">
                {item.avatarUrl ? (
                  <Image source={{ uri: item.avatarUrl }} className="h-10 w-10 rounded-full" />
                ) : (
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-cinza-medio">
                    <Text className="text-sm font-semibold text-gray-300">{getInitials(item.displayName)}</Text>
                  </View>
                )}
                <Text className="flex-1 text-sm font-medium text-white" numberOfLines={1}>
                  {item.displayName}
                </Text>
              </Pressable>
            </Link>
          )}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="items-center py-3">
                <Spinner size={20} />
              </View>
            ) : null
          }
        />
      )}
    </Modal>
  );
}
