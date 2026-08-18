import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Search,
  Sparkles,
  ListMusic,
  Trophy,
  LogOut,
  Settings,
  User as UserIcon,
  X,
  ImagePlus,
  MessageSquare,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/shared/auth/auth.store";
import { useLogoutMutation } from "@/queries/auth";
import { useLastEditedAlbumQuery } from "@/queries/discovery";
import { useUnansweredFeedbacksCountQuery } from "@/queries/feedbacks";
import LogoFull from "@/assets/logo-full.png";
import LogoIcon from "@/assets/logo-icon.png";
import LanguageSelector from "@/componentes/LanguageSelector";
import { cn } from "@/shared/lib/cn";
import { getScoreColorClasses } from "@/shared/lib/scoreColor";
import { ProgressBar } from "@/shared/ui/ProgressBar";
import { toast } from "@/shared/ui/toast-store";
import { useSidebarStore } from "./sidebar.store";

export function AppSidebar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";
  const collapsed = useSidebarStore((s) => s.collapsed);
  const logoutMutation = useLogoutMutation();
  const lastEditedAlbum = useLastEditedAlbumQuery(user?.id).data;
  const unansweredFeedbacksCount = useUnansweredFeedbacksCountQuery(isAdmin).data ?? 0;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // ver a própria avaliação de um álbum (via /profile/$userId/album/$albumId) é
  // conteúdo de "Minhas Avaliações", mesmo a URL sendo escopada por usuário.
  const isOwnAlbumRoute = Boolean(user && pathname.startsWith(`/profile/${user.id}/album/`));
  // álbum aberto a partir do Feed usa rota aninhada (/feed/$userId/album/$albumId)
  // só pra manter "Feed" ativo aqui, seja o ranking próprio ou de outro usuário.
  const isFeedAlbumRoute = pathname.startsWith("/feed/");
  const activePath = isFeedAlbumRoute ? "/feed" : isOwnAlbumRoute ? "/my-rankings" : pathname;
  // álbum aberto a partir de Pesquisar/Top Álbuns/Feed usa rota aninhada
  // (/search/$albumId, /top-albums/$albumId, /feed/$userId/album/$albumId) só
  // pra manter esse item ativo aqui.
  const isNavActive = (to: string) => activePath === to || activePath.startsWith(`${to}/`);

  // card "continuar avaliando" (mobile): aparece nas telas de navegação
  // principal (Feed, Minhas Avaliações, Buscar, Descobrir, Top Álbuns) —
  // fora delas (perfil, álbum aberto...) compete com conteúdo próprio da tela.
  const showContinueEditingCard = ["/feed", "/my-rankings", "/search", "/discover", "/top-albums"].includes(
    pathname,
  );
  // dispensado fica escondido até o usuário editar OUTRO álbum — a chave
  // inclui o albumId de propósito, então editar um novo álbum "reseta" o card.
  const [dismissedAlbumId, setDismissedAlbumId] = useState<string | null>(
    () => sessionStorage.getItem("continue-editing-dismissed"),
  );

  // ordem: primeiro o que é "seu" (Feed, Minhas avaliações), depois o que ajuda
  // a achar conteúdo novo (Buscar → Descobrir → Top álbuns, do mais direto ao
  // mais exploratório).
  const NAV_ITEMS = [
    { to: "/feed", label: t("nav.feed"), icon: Home },
    { to: "/my-rankings", label: t("nav.myRankings"), icon: ListMusic },
    { to: "/search", label: t("nav.search"), icon: Search },
    { to: "/discover", label: t("nav.discover"), icon: Sparkles },
    { to: "/top-albums", label: t("nav.topAlbums"), icon: Trophy },
  ] as const;

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    try {
      await logoutMutation.mutateAsync();
      await navigate({ to: "/login" });
    } catch {
      toast.error(t("nav.logoutError"));
    }
  };

  const isProfileActive = isNavActive("/profile");
  const mobileTabCount = NAV_ITEMS.length + 1;
  const activeTabIndex = (() => {
    const navIndex = NAV_ITEMS.findIndex(({ to }) => isNavActive(to));
    if (navIndex !== -1) return navIndex;
    if (isProfileActive) return NAV_ITEMS.length;
    return -1;
  })();

  return (
    <>
      {/* desktop: sidebar fixa lateral */}
      <aside
        id="app-sidebar"
        className={cn(
          "hidden md:flex shrink-0 bg-cinza-escuro flex-col h-screen sticky top-0 p-4 transition-[width] duration-200 overflow-hidden",
          collapsed ? "w-20" : "w-72",
        )}
      >
        {/* -mx-4: logo sangra até a borda do aside, ignorando o padding que o
            resto do conteúdo (nav, cards, logout) mantém */}
        <div className={cn("mb-8 flex items-center justify-center", !collapsed && "-mx-4")}>
          <img
            src={collapsed ? LogoIcon : LogoFull}
            alt="Track by Track"
            className={cn("transition-all object-contain", collapsed ? "w-9 h-9" : "w-44")}
          />
        </div>

        <nav className={cn("flex-1 flex flex-col", collapsed ? "gap-3" : "gap-1")}>
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 transition",
                collapsed && "justify-center px-0 py-3.5",
                isNavActive(to)
                  ? "bg-dourado/10 text-dourado hover:bg-dourado/15"
                  : "text-gray-300 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon size={collapsed ? 22 : 20} className="shrink-0" />
              {!collapsed && <span className="text-sm sm:text-base">{label}</span>}
            </Link>
          ))}

          <Link
            to="/feedbacks"
            title={collapsed ? t("nav.feedbacks") : undefined}
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition",
              collapsed && "justify-center px-0 py-3.5",
              isNavActive("/feedbacks")
                ? "bg-dourado/10 text-dourado hover:bg-dourado/15"
                : "text-gray-300 hover:bg-white/5 hover:text-white",
            )}
          >
            <div className="relative shrink-0 flex items-center justify-center">
              <MessageSquare size={collapsed ? 22 : 20} />
              {collapsed && (
                isAdmin && unansweredFeedbacksCount > 0 ? (
                  <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-dourado text-grafite text-[10px] font-bold flex items-center justify-center">
                    {unansweredFeedbacksCount > 9 ? "9+" : unansweredFeedbacksCount}
                  </span>
                ) : (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-dourado shadow-xs shadow-dourado animate-pulse" />
                )
              )}
            </div>
            {!collapsed && (
              <div className="flex flex-1 items-center justify-between min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm sm:text-base truncate">{t("nav.feedbacks")}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-dourado/20 text-dourado border border-dourado/40 shrink-0">
                    New
                  </span>
                </div>
                {isAdmin && unansweredFeedbacksCount > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-dourado text-grafite text-xs font-bold flex items-center justify-center ml-2">
                    {unansweredFeedbacksCount > 99 ? "99+" : unansweredFeedbacksCount}
                  </span>
                )}
              </div>
            )}
          </Link>

          {/* admin-only: não entra em NAV_ITEMS de propósito — essa lista também dirige a
              tab bar mobile (mobileTabCount, activeTabIndex), e este item é desktop-only. */}
          {isAdmin && (
            <Link
              to="/admin/generate-posts"
              title={collapsed ? t("nav.generatePosts") : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 transition",
                collapsed && "justify-center px-0 py-3.5",
                isNavActive("/admin/generate-posts")
                  ? "bg-dourado/10 text-dourado hover:bg-dourado/15"
                  : "text-gray-300 hover:bg-white/5 hover:text-white",
              )}
            >
              <ImagePlus size={collapsed ? 22 : 20} className="shrink-0" />
              {!collapsed && (
                <span className="text-sm sm:text-base">{t("nav.generatePosts")}</span>
              )}
            </Link>
          )}
        </nav>

        {lastEditedAlbum && !collapsed && (
          <Link
            to="/album/$albumId"
            params={{ albumId: lastEditedAlbum.albumId }}
            className="flex flex-col gap-2 rounded-lg border border-white/10 p-2.5 text-gray-300 hover:bg-white/5 hover:text-white transition"
          >
            <div className="flex items-center gap-3">
              {lastEditedAlbum.albumImageUrl ? (
                <img
                  src={lastEditedAlbum.albumImageUrl}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-white/10">
                  <ListMusic size={18} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wide text-gray-500">
                  {t("nav.continueEditing")}
                </p>
                <p className="truncate text-sm">{lastEditedAlbum.albumName}</p>
                <p className="truncate text-xs text-gray-400">{lastEditedAlbum.albumArtist}</p>
              </div>
              <span
                className={cn(
                  "shrink-0 text-sm font-bold",
                  getScoreColorClasses(
                    lastEditedAlbum.averageScore,
                    lastEditedAlbum.progress.rated === lastEditedAlbum.progress.total,
                  ).text,
                )}
              >
                {lastEditedAlbum.averageScore.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <ProgressBar value={lastEditedAlbum.progress.percentage} className="h-1 flex-1" />
              <span className="text-gray-500 text-[11px] shrink-0 tabular-nums">
                {t("common.tracksProgress", {
                  rated: lastEditedAlbum.progress.rated,
                  total: lastEditedAlbum.progress.total,
                })}
              </span>
            </div>
          </Link>
        )}

        <div className="border-t border-white/10 pt-4 mt-4">
          <button
            onClick={handleLogout}
            title={collapsed ? t("nav.logout") : undefined}
            className={cn(
              "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-gray-400 hover:bg-white/5 hover:text-red-400 transition cursor-pointer",
              collapsed && "justify-center px-0",
            )}
          >
            <LogOut size={20} className="shrink-0" />
            {!collapsed && <span className="text-sm sm:text-base">{t("nav.logout")}</span>}
          </button>
        </div>
      </aside>

      {/* mobile: card flutuante "continuar avaliando" acima da tab bar —
          só em Feed/Search, e só se o usuário não dispensou esse álbum */}
      {lastEditedAlbum && showContinueEditingCard && dismissedAlbumId !== lastEditedAlbum.albumId && (
        <div
          className="md:hidden fixed inset-x-0 z-30 mx-3 flex items-center gap-2.5 rounded-lg border border-white/10 bg-cinza-escuro/95 backdrop-blur p-2 pr-1.5 shadow-lg shadow-black/40"
          style={{ bottom: "calc(4rem + env(safe-area-inset-bottom))" }}
        >
          <Link
            to="/album/$albumId"
            params={{ albumId: lastEditedAlbum.albumId }}
            className="flex min-w-0 flex-1 items-center gap-2.5"
          >
            {lastEditedAlbum.albumImageUrl ? (
              <img
                src={lastEditedAlbum.albumImageUrl}
                alt=""
                className="h-9 w-9 shrink-0 rounded object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-white/10">
                <ListMusic size={16} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[9px] uppercase tracking-wide text-gray-500 leading-none mb-0.5">
                {t("nav.continueEditing")}
              </p>
              <p className="truncate text-xs text-gray-200 leading-tight">
                {lastEditedAlbum.albumName}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <ProgressBar value={lastEditedAlbum.progress.percentage} className="h-1 flex-1" />
                <span className="text-gray-500 text-[10px] shrink-0 tabular-nums">
                  {t("common.tracksProgress", {
                    rated: lastEditedAlbum.progress.rated,
                    total: lastEditedAlbum.progress.total,
                  })}
                </span>
              </div>
            </div>
            <span
              className={cn(
                "shrink-0 text-sm font-bold",
                getScoreColorClasses(
                  lastEditedAlbum.averageScore,
                  lastEditedAlbum.progress.rated === lastEditedAlbum.progress.total,
                ).text,
              )}
            >
              {lastEditedAlbum.averageScore.toFixed(1)}
            </span>
          </Link>
          <button
            type="button"
            aria-label={t("common.dismiss")}
            onClick={() => {
              sessionStorage.setItem("continue-editing-dismissed", lastEditedAlbum.albumId);
              setDismissedAlbumId(lastEditedAlbum.albumId);
            }}
            className="shrink-0 rounded-full p-1.5 text-gray-500 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* mobile: bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch bg-cinza-escuro border-t border-white/10 pb-[env(safe-area-inset-bottom)]"
      >
        {activeTabIndex !== -1 && (
          <span
            className="absolute bottom-[env(safe-area-inset-bottom)] left-0 h-0.5 rounded-full bg-dourado transition-transform duration-300 ease-out"
            style={{
              width: `${100 / mobileTabCount}%`,
              transform: `translateX(${activeTabIndex * 100}%)`,
            }}
          />
        )}

        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 transition-colors",
              isNavActive(to) ? "text-dourado" : "text-gray-400 hover:text-white",
            )}
          >
            <Icon
              size={22}
              className={cn("transition-transform duration-200", isNavActive(to) && "scale-110")}
            />
            {isNavActive(to) && (
              <span className="text-[10px] leading-none truncate max-w-full px-1 animate-[fadeIn_0.15s_ease-out]">
                {label}
              </span>
            )}
          </Link>
        ))}

        <div className="relative flex flex-1" ref={profileMenuRef}>
          {profileMenuOpen && (
            <div
              role="menu"
              className="absolute bottom-full right-0 mb-1 min-w-48 rounded-lg border border-white/10 bg-cinza-escuro shadow-lg shadow-black/40 overflow-hidden z-50"
            >
              <Link
                to="/profile/$userId"
                params={{ userId: user?.id ?? "" }}
                role="menuitem"
                onClick={() => setProfileMenuOpen(false)}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-base text-left text-gray-200 hover:bg-white/5 transition"
              >
                <UserIcon size={18} />
                <span className="flex-1 truncate">{t("nav.profile")}</span>
              </Link>
              <Link
                to="/profile"
                role="menuitem"
                onClick={() => setProfileMenuOpen(false)}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-base text-left text-gray-200 hover:bg-white/5 transition"
              >
                <Settings size={18} />
                <span className="flex-1 truncate">{t("nav.settings")}</span>
              </Link>
              <Link
                to="/feedbacks"
                role="menuitem"
                onClick={() => setProfileMenuOpen(false)}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-base text-left text-gray-200 hover:bg-white/5 transition"
              >
                <MessageSquare size={18} />
                <span className="truncate">{t("nav.feedbacks")}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-dourado/20 text-dourado border border-dourado/40">
                  New
                </span>
                {isAdmin && unansweredFeedbacksCount > 0 && (
                  <span className="ml-auto min-w-4.5 h-4.5 px-1.5 rounded-full bg-dourado text-grafite text-xs font-bold flex items-center justify-center">
                    {unansweredFeedbacksCount}
                  </span>
                )}
              </Link>
              <div className="border-t border-white/10">
                <LanguageSelector direction="up" className="w-full" />
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-base text-left text-gray-400 hover:bg-white/5 hover:text-red-400 transition cursor-pointer"
              >
                <LogOut size={18} />
                <span className="flex-1 truncate">{t("nav.logout")}</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setProfileMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={profileMenuOpen}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 transition-colors cursor-pointer",
              isProfileActive ? "text-dourado" : "text-gray-400 hover:text-white",
            )}
          >
            <UserIcon
              size={22}
              className={cn("transition-transform duration-200", isProfileActive && "scale-110")}
            />
            {isProfileActive && (
              <span className="text-[10px] leading-none truncate max-w-full px-1 animate-[fadeIn_0.15s_ease-out]">
                {t("nav.profile")}
              </span>
            )}
          </button>
        </div>
      </nav>
    </>
  );
}
