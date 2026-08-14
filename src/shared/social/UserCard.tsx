import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { CalendarDays, ListMusic, Music2 } from "lucide-react";
import { getInitials } from "@/shared/lib/initials";
import { formatMonthYear } from "@/shared/lib/date";
import type { UserStatsItem } from "@/queries/discovery";

/**
 * Card de usuário usado em toda listagem de gente (busca, seguidores, seguindo).
 * As stats vêm de fora (`useUsersStatsQuery` na lista, uma request pra página
 * inteira) — o card não busca nada, senão cada linha viraria uma chamada HTTP.
 */
export function UserCard({
  userId,
  displayName,
  avatarUrl,
  memberSince,
  stats,
  isStatsLoading,
  onNavigate,
}: {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  /** ISO 8601 do cadastro. `undefined` enquanto a API não devolver o campo. */
  memberSince?: string;
  stats?: UserStatsItem;
  isStatsLoading?: boolean;
  onNavigate?: () => void;
}) {
  const { t, i18n } = useTranslation();

  return (
    <Link
      to="/profile/$userId"
      params={{ userId }}
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-3 hover:bg-white/5 hover:border-white/10 transition"
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="w-12 h-12 rounded-full object-cover shrink-0 ring-1 ring-white/10"
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-cinza-medio flex items-center justify-center shrink-0 ring-1 ring-white/10">
          <span className="text-gray-300 text-base font-semibold leading-none">
            {getInitials(displayName)}
          </span>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-white text-sm font-medium truncate">{displayName}</p>

        {memberSince && (
          <p className="flex items-center gap-1 text-gray-500 text-xs mt-0.5">
            <CalendarDays size={11} className="shrink-0" />
            {t("user.memberSince", { date: formatMonthYear(memberSince, i18n.language) })}
          </p>
        )}

        {isStatsLoading ? (
          <div className="mt-1.5 h-3 w-32 rounded bg-white/5 animate-pulse" />
        ) : (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-gray-400 text-xs mt-1">
            <span className="flex items-center gap-1">
              <ListMusic size={11} className="shrink-0 text-dourado" />
              <strong className="text-white font-semibold">{stats?.total ?? 0}</strong>{" "}
              {t("myRankings.statAlbums")}
            </span>
            <span className="flex items-center gap-1">
              <Music2 size={11} className="shrink-0 text-dourado" />
              <strong className="text-white font-semibold">{stats?.tracksRated ?? 0}</strong>{" "}
              {t("myRankings.statTracksRated")}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
