import { Text } from "react-native";
import { useTranslation } from "react-i18next";
import { UserPlus, UserCheck } from "lucide-react-native";
import { useFollowMutation, useFollowStatsQuery, useUnfollowMutation } from "@/queries/follows";
import { useAuthStore } from "@/shared/auth/auth.store";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/toast-store";
import { getApiErrorMessage } from "@/shared/api/errors";

// Porta 1:1 de src/shared/social/FollowButton.tsx (web).
export function FollowButton({
  userId,
  size = "md",
  className,
}: {
  userId: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const statsQuery = useFollowStatsQuery(userId);
  const follow = useFollowMutation();
  const unfollow = useUnfollowMutation();

  if (!currentUser || currentUser.id === userId) return null;

  const stats = statsQuery.data;
  const isFollowing = stats?.isFollowing ?? false;
  const isPending = follow.isPending || unfollow.isPending;

  const handlePress = () => {
    const mutation = isFollowing ? unfollow : follow;
    mutation.mutate(userId, {
      onError: (error) => toast.error(getApiErrorMessage(error, t("follow.error"))),
    });
  };

  return (
    <Button
      size={size}
      variant={isFollowing ? "outline" : "primary"}
      onPress={handlePress}
      disabled={isPending || statsQuery.isLoading}
      className={className}
    >
      <>
        {isFollowing ? (
          <UserCheck size={16} color="#ffba08" />
        ) : (
          <UserPlus size={16} color="#ffffff" />
        )}
        <Text className={isFollowing ? "text-sm font-semibold text-dourado" : "text-sm font-semibold text-white"}>
          {isFollowing ? t("follow.following") : t("follow.follow")}
        </Text>
      </>
    </Button>
  );
}
