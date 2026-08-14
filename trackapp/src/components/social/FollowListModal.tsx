import { FlatList, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useFollowersQuery, useFollowingQuery } from "@/queries/follows";
import { useUsersStatsQuery } from "@/queries/discovery";
import { UserCard } from "@/components/social/UserCard";
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
  const stats = useUsersStatsQuery(items.map((item) => item.userId));

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
            <UserCard
              userId={item.userId}
              displayName={item.displayName}
              avatarUrl={item.avatarUrl}
              memberSince={item.createdAt}
              stats={stats.data?.get(item.userId)}
              isStatsLoading={stats.isPending}
              onNavigate={() => onOpenChange(false)}
            />
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
