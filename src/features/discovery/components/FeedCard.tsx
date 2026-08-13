import { Link } from "@tanstack/react-router";
import { Music } from "lucide-react";
import type { FeedItem } from "@/shared/api/types";
import type { ViewMode } from "@/shared/ui/ViewToggle";
import { useAuthStore } from "@/shared/auth/auth.store";
import { cn } from "@/shared/lib/cn";
import { getScoreColorClasses } from "@/shared/lib/scoreColor";
import { getInitials } from "@/shared/lib/initials";

export function FeedCard({ item, variant = "list" }: { item: FeedItem; variant?: ViewMode }) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isGrid = variant === "grid";
  const isComplete = item.totalTracks > 0 && item.ratedTracks === item.totalTracks;
  const scoreColor = getScoreColorClasses(item.averageScore, isComplete);
  const isOwn = item.userId === currentUserId;

  return (
    <Link
      // sua própria avaliação vai direto pra edição — o "Avaliar agora" (via view do
      // usuário) só faz sentido pro review de outra pessoa.
      {...(isOwn
        ? { to: "/album/$albumId", params: { albumId: item.albumId } }
        : {
            to: "/perfil/$usuarioId/album/$albumId",
            params: { usuarioId: item.userId, albumId: item.albumId },
          })}
      className={cn(
        "bg-cinza-escuro border border-white/5 rounded-xl hover:border-dourado/30 hover:bg-white/5 transition",
        isGrid ? "flex flex-col" : "flex gap-3 p-3",
      )}
    >
      {item.albumImageUrl ? (
        <img
          src={item.albumImageUrl}
          alt=""
          decoding="async"
          className={cn(
            // bg fica visível enquanto a capa ainda não baixou (lazy), evitando buraco no grid
            "object-cover shrink-0 bg-cinza-medio",
            isGrid ? "w-full aspect-square rounded-t-xl" : "w-16 h-16 rounded-lg",
          )}
        />
      ) : (
        <div
          className={cn(
            "bg-cinza-medio flex items-center justify-center shrink-0",
            isGrid ? "w-full aspect-square rounded-t-xl" : "w-16 h-16 rounded-lg",
          )}
        >
          <Music size={isGrid ? 32 : 24} className="text-gray-500" />
        </div>
      )}
      <div className={cn("min-w-0", isGrid ? "p-3 sm:p-4 flex flex-col flex-1" : "flex-1")}>
        <p
          className={cn(
            "text-white font-semibold",
            isGrid ? "text-lg leading-tight line-clamp-2" : "text-base truncate",
          )}
        >
          {item.albumName}
        </p>
        <p className="text-gray-400 text-sm truncate">{item.albumArtist}</p>
        <div
          className={cn(
            "flex items-center justify-between gap-2 min-w-0",
            isGrid ? "mt-auto pt-2" : "mt-2",
          )}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {item.userAvatarUrl ? (
              <img
                src={item.userAvatarUrl}
                alt=""
                className="w-5 h-5 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-cinza-medio flex items-center justify-center shrink-0">
                <span className="text-gray-300 text-[10px] font-semibold leading-none">
                  {getInitials(item.userDisplayName)}
                </span>
              </div>
            )}
            <span className="text-gray-300 text-sm font-medium truncate">{item.userDisplayName}</span>
          </div>
          <span className={cn("font-bold shrink-0", isGrid ? "text-lg" : "text-base", scoreColor.text)}>
            {item.averageScore.toFixed(1)}
          </span>
        </div>
      </div>
    </Link>
  );
}
