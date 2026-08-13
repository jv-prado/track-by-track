import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, Search, ListMusic, Trophy, LogOut, User as UserIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/shared/auth/auth.store";
import { useLogoutMutation } from "@/queries/auth";
import Logo from "@/componentes/sidebar/assets/Logo.svg";
import LanguageSelector from "@/componentes/LanguageSelector";
import { cn } from "@/shared/lib/cn";

export function AppSidebar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logoutMutation = useLogoutMutation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const NAV_ITEMS = [
    { to: "/", label: t("nav.feed"), icon: Home },
    { to: "/pesquisar", label: t("nav.search"), icon: Search },
    { to: "/minhas-avaliacoes", label: t("nav.myRankings"), icon: ListMusic },
    { to: "/top-albuns", label: t("nav.topAlbums"), icon: Trophy },
  ] as const;

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    await navigate({ to: "/login" });
  };

  return (
    <>
      {/* desktop: sidebar fixa lateral */}
      <aside className="hidden md:flex w-64 shrink-0 bg-cinza-escuro flex-col h-screen sticky top-0 p-4">
        <img src={Logo} alt="Track by Track" className="w-28 mx-auto mb-8" />

        <nav className="flex-1 flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 transition",
                pathname === to
                  ? "bg-dourado/10 text-dourado hover:bg-dourado/15"
                  : "text-gray-300 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon size={20} />
              <span className="text-sm sm:text-base">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="border-t border-white/10 pt-4 mt-4">
          {user && (
            <Link
              to="/perfil"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-300 hover:bg-white/5 hover:text-white transition mb-1"
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <UserIcon size={20} />
              )}
              <span className="text-sm truncate">{user.displayName}</span>
            </Link>
          )}

          <LanguageSelector direction="up" className="mb-1" />

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-gray-400 hover:bg-white/5 hover:text-red-400 transition cursor-pointer"
          >
            <LogOut size={20} />
            <span className="text-sm sm:text-base">{t("nav.logout")}</span>
          </button>
        </div>
      </aside>

      {/* mobile: topbar (logo + idioma + logout) */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between gap-2 bg-cinza-escuro px-4 h-14 border-b border-white/10">
        <img src={Logo} alt="Track by Track" className="h-8" />
        <div className="flex items-center gap-1">
          <LanguageSelector direction="down" className="w-auto" />
          <button
            onClick={handleLogout}
            aria-label={t("nav.logout")}
            className="flex items-center justify-center rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-red-400 transition cursor-pointer"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* mobile: bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch bg-cinza-escuro border-t border-white/10 pb-[env(safe-area-inset-bottom)]"
      >
        {[
          ...NAV_ITEMS,
          { to: "/perfil", label: t("nav.profile"), icon: UserIcon },
        ].map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition",
              pathname === to ? "text-dourado" : "text-gray-400 hover:text-white",
            )}
          >
            <Icon size={20} />
            <span className="text-[10px] leading-none truncate max-w-full px-1">{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
