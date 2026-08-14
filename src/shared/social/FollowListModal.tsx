import { useTranslation } from "react-i18next";
import { useFollowersQuery, useFollowingQuery } from "@/queries/follows";
import { useUsersStatsQuery } from "@/queries/discovery";
import { useInfiniteScroll } from "@/shared/lib/use-infinite-scroll";
import { UserCard } from "@/shared/social/UserCard";
import { Modal } from "@/shared/ui/Modal";
import { Spinner } from "@/shared/ui/Spinner";
import { EmptyState } from "@/shared/ui/EmptyState";

type FollowListKind = "followers" | "following";

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
  const sentinelRef = useInfiniteScroll({
    hasNextPage: Boolean(hasNextPage),
    isFetchingNextPage,
    fetchNextPage,
  });

  return (
    <Modal
      open={kind !== null}
      onOpenChange={onOpenChange}
      title={kind === "followers" ? t("follow.followersTitle") : t("follow.followingTitle")}
    >
      <div className="flex flex-col gap-1 overflow-y-auto -mx-2">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-6 w-6" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title={
              kind === "followers" ? t("follow.emptyFollowers") : t("follow.emptyFollowing")
            }
          />
        ) : (
          <>
            {items.map((item) => (
              <UserCard
                key={item.userId}
                userId={item.userId}
                displayName={item.displayName}
                avatarUrl={item.avatarUrl}
                memberSince={item.createdAt}
                stats={stats.data?.get(item.userId)}
                isStatsLoading={stats.isPending}
                onNavigate={() => onOpenChange(false)}
              />
            ))}

            {hasNextPage && (
              <div ref={sentinelRef} className="flex justify-center py-3">
                {isFetchingNextPage && <Spinner className="h-5 w-5" />}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
