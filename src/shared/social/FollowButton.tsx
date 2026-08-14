import { useTranslation } from "react-i18next";
import { UserPlus, UserCheck } from "lucide-react";
import {
  useFollowMutation,
  useFollowStatsQuery,
  useUnfollowMutation,
} from "@/queries/follows";
import { useAuthStore } from "@/shared/auth/auth.store";
import { Button } from "@/shared/ui/Button";
import { toast } from "@/shared/ui/toast-store";
import { getApiErrorMessage } from "@/shared/api/errors";
import { cn } from "@/shared/lib/cn";

/**
 * Some no próprio perfil e para visitante deslogado — seguir exige sessão, e
 * um botão que só serve pra levar ao login é ruído na tela do perfil.
 */
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

  const handleClick = () => {
    const mutation = isFollowing ? unfollow : follow;
    mutation.mutate(userId, {
      onError: (error) => toast.error(getApiErrorMessage(error, t("follow.error"))),
    });
  };

  return (
    <Button
      type="button"
      size={size}
      variant={isFollowing ? "outline" : "primary"}
      onClick={handleClick}
      disabled={isPending || statsQuery.isLoading}
      aria-pressed={isFollowing}
      className={cn(
        isFollowing && "border-dourado/40 bg-dourado/10 text-dourado hover:bg-dourado/20 hover:text-dourado",
        className,
      )}
    >
      {isFollowing ? (
        <>
          <UserCheck size={16} />
          {t("follow.following")}
        </>
      ) : (
        <>
          <UserPlus size={16} />
          {t("follow.follow")}
        </>
      )}
    </Button>
  );
}
