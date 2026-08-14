import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { User as UserIcon, Settings, LogOut, PanelLeft, PanelLeftClose } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/shared/auth/auth.store";
import { useLogoutMutation } from "@/queries/auth";
import LanguageSelector from "@/componentes/LanguageSelector";
import { NotificationsBell } from "./NotificationsBell";
import { useSidebarStore } from "./sidebar.store";
import { toast } from "@/shared/ui/toast-store";
import { cn } from "@/shared/lib/cn";

export function AppHeader() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggleSidebar = useSidebarStore((s) => s.toggle);
  const logoutMutation = useLogoutMutation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    // IntersectionObserver em vez de listener de scroll: funciona não importa
    // qual elemento realmente rola (window, main, ou algum wrapper do Capacitor).
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setScrolled(!entry.isIntersecting);
      },
      {
        threshold: 0,
        rootMargin: "8px 0px 0px 0px",
      },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      await logoutMutation.mutateAsync();
      await navigate({ to: "/login" });
    } catch {
      toast.error(t("nav.logoutError"));
    }
  };

  return (
    <>
      <div ref={sentinelRef} className="h-px w-full" aria-hidden />
      <header
        className={cn(
          "sticky top-0 z-30 hidden items-center gap-4 px-4 pt-4 pb-3 transition-all duration-200 sm:px-10 md:flex md:px-6 lg:px-10",
          "after:content-[''] after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-3 after:h-3 after:transition-opacity after:duration-200",
          // Vidro de verdade: sem tingir de cinza-escuro (isso vira painel sólido, não
          // vidro). Só blur + um wash branco bem leve pro frost — o roxo passa através.
          // Só no scroll — hover não aciona (pedido explícito, sem efeito no bg ao passar o mouse).
          scrolled
            ? "bg-white/5 backdrop-blur-lg after:bg-gradient-to-b after:from-black/30 after:to-transparent after:opacity-100"
            : "bg-transparent after:opacity-0",
        )}
      >
      <button
        type="button"
        onClick={toggleSidebar}
        aria-expanded={!collapsed}
        aria-controls="app-sidebar"
        aria-label={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
        className="flex items-center justify-center rounded-lg p-2.5 text-gray-300 hover:bg-white/5 hover:text-white transition cursor-pointer"
      >
        {collapsed ? <PanelLeft size={22} /> : <PanelLeftClose size={22} />}
      </button>
      <div className="ml-auto flex items-center gap-4">
      <LanguageSelector direction="down" className="w-auto" size="lg" />
      {user && <NotificationsBell />}
      {user && (
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2 text-base text-gray-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <UserIcon size={28} />
            )}
            <span className="truncate">{user.displayName}</span>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-1 min-w-48 rounded-lg border border-white/10 bg-cinza-escuro shadow-lg shadow-black/40 overflow-hidden z-50"
            >
              <Link
                to="/profile/$userId"
                params={{ userId: user.id }}
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-base text-left text-gray-200 hover:bg-white/5 transition"
              >
                <UserIcon size={18} />
                <span className="flex-1 truncate">{t("nav.profile")}</span>
              </Link>
              <Link
                to="/profile"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-base text-left text-gray-200 hover:bg-white/5 transition"
              >
                <Settings size={18} />
                <span className="flex-1 truncate">{t("nav.settings")}</span>
              </Link>
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
        </div>
      )}
      </div>
      </header>
    </>
  );
}
