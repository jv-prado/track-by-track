import { Link, useNavigate } from "@tanstack/react-router";
import { Music } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { FeedItem } from "@/shared/api/types";
import type { ViewMode } from "@/shared/ui/ViewToggle";
import { cn } from "@/shared/lib/cn";
import { getScoreColorClasses } from "@/shared/lib/scoreColor";
import { getInitials } from "@/shared/lib/initials";
import { ProgressBar } from "@/shared/ui/ProgressBar";

export function FeedCard({
  item,
  variant = "list",
  linkTo = "/profile/$userId/album/$albumId",
  showProgress = false,
}: {
  item: FeedItem;
  variant?: ViewMode;
  /** rota aninhada opcional — mantém a seção de origem ativa na sidebar (ver AppSidebar). */
  linkTo?: "/profile/$userId/album/$albumId" | "/feed/$userId/album/$albumId";
  /** barra de progresso de avaliação — só faz sentido nos MEUS rankings (feed/perfil público são de terceiros). */
  showProgress?: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isGrid = variant === "grid";
  const isComplete = item.totalTracks > 0 && item.ratedTracks === item.totalTracks;
  const scoreColor = getScoreColorClasses(item.averageScore, isComplete);
  const progressPct =
    item.totalTracks > 0 ? Math.round((item.ratedTracks / item.totalTracks) * 100) : 0;

  // div em vez de Link: card tem um Link aninhado pro perfil do usuário (avatar/nome),
  // e <a> dentro de <a> é HTML inválido — navegação vem de onClick + role="link".
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => navigate({ to: linkTo, params: { userId: item.userId, albumId: item.albumId } })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate({ to: linkTo, params: { userId: item.userId, albumId: item.albumId } });
        }
      }}
      className={cn(
        "bg-cinza-escuro border border-white/5 rounded-xl hover:border-dourado/30 hover:bg-white/5 transition cursor-pointer",
        isGrid ? "flex flex-col" : "flex gap-3 p-3",
      )}
    >
      <div className={cn("relative shrink-0", isGrid ? "w-full" : "w-16 h-16")}>
        {item.albumImageUrl ? (
          <img
            src={item.albumImageUrl}
            alt=""
            decoding="async"
            className={cn(
              // bg fica visível enquanto a capa ainda não baixou (lazy), evitando buraco no grid
              "object-cover bg-cinza-medio w-full h-full",
              isGrid ? "aspect-square rounded-t-xl" : "rounded-lg",
            )}
          />
        ) : (
          <div
            className={cn(
              "bg-cinza-medio flex items-center justify-center w-full h-full",
              isGrid ? "aspect-square rounded-t-xl" : "rounded-lg",
            )}
          >
            <Music size={isGrid ? 32 : 24} className="text-gray-500" />
          </div>
        )}
        {/* janela de 24h — ver FEED_BADGE_WINDOW_MS em discovery.service.ts */}
        {item.badge && (
          <span
            className={cn(
              "absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-none",
              item.badge === "new" ? "bg-green-500 text-grafite" : "bg-dourado text-grafite",
            )}
          >
            {item.badge === "new" ? t("feed.badgeNew") : t("feed.badgeUpdated")}
          </span>
        )}
      </div>
      <div className={cn("min-w-0", isGrid ? "p-3 sm:p-4 flex flex-col flex-1" : "flex-1")}>
        <p
          className={cn(
            "text-white font-semibold",
            isGrid ? "text-base sm:text-lg leading-tight line-clamp-2" : "text-base truncate",
          )}
        >
          {item.albumName}
        </p>
        <p className="text-gray-400 text-sm truncate">{item.albumArtist}</p>
        <div className={cn("flex items-center justify-between gap-2 min-w-0", isGrid ? "mt-auto pt-2" : "mt-2")}>
          <Link
            to="/profile/$userId"
            params={{ userId: item.userId }}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 min-w-0 hover:underline"
          >
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
          </Link>
          <span className={cn("font-bold shrink-0", isGrid ? "text-base sm:text-lg" : "text-base", scoreColor.text)}>
            {item.averageScore.toFixed(1)}
          </span>
        </div>
        {showProgress && (
          <div className="flex items-center gap-1.5 mt-2">
            <ProgressBar value={progressPct} className="h-1 flex-1" />
            <span className="text-gray-500 text-[11px] shrink-0 tabular-nums">
              {t("common.tracksProgress", { rated: item.ratedTracks, total: item.totalTracks })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
