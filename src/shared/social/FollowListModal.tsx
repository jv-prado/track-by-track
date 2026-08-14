import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { useFollowersQuery, useFollowingQuery } from "@/queries/follows";
import { useInfiniteScroll } from "@/shared/lib/use-infinite-scroll";
import { getInitials } from "@/shared/lib/initials";
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
              <Link
                key={item.userId}
                to="/profile/$userId"
                params={{ userId: item.userId }}
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5 transition"
              >
                {item.avatarUrl ? (
                  <img
                    src={item.avatarUrl}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-white/10"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-cinza-medio flex items-center justify-center shrink-0 ring-1 ring-white/10">
                    <span className="text-gray-300 text-sm font-semibold leading-none">
                      {getInitials(item.displayName)}
                    </span>
                  </div>
                )}
                <span className="text-white text-sm font-medium truncate">
                  {item.displayName}
                </span>
              </Link>
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
