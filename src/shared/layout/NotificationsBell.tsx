import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Bell, MessageSquare, UserPlus } from "lucide-react";
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
  useUnreadCountQuery,
} from "@/queries/notifications";
import { Spinner } from "@/shared/ui/Spinner";
import { formatDate } from "@/shared/lib/date";
import { cn } from "@/shared/lib/cn";
import type { NotificationView } from "@/shared/api/types";

/** Acima disso o badge vira "9+": número grande não cabe no círculo. */
const BADGE_CAP = 9;

function notificationLink(notification: NotificationView) {
  if (notification.type === "comment" && notification.albumId) {
    return {
      to: "/profile/$userId/album/$albumId" as const,
      params: { userId: notification.actorId, albumId: notification.albumId },
    };
  }
  return { to: "/profile/$userId" as const, params: { userId: notification.actorId } };
}

export function NotificationsBell() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = useUnreadCountQuery();
  const notifications = useNotificationsQuery(open);
  const markRead = useMarkNotificationReadMutation();
  const markAllRead = useMarkAllNotificationsReadMutation();

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const count = unreadCount.data ?? 0;
  const items = notifications.data?.data ?? [];

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("notifications.title")}
        className="relative flex items-center justify-center rounded-lg p-2.5 text-gray-300 hover:bg-white/5 hover:text-white transition cursor-pointer"
      >
        <Bell size={22} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-dourado text-grafite text-xs font-bold flex items-center justify-center">
            {count > BADGE_CAP ? `${BADGE_CAP}+` : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 w-80 max-h-96 overflow-y-auto rounded-lg border border-white/10 bg-cinza-escuro shadow-lg shadow-black/40 z-50"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <span className="text-sm font-bold text-white">{t("notifications.title")}</span>
            {count > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                className="text-xs text-dourado hover:underline cursor-pointer"
              >
                {t("notifications.markAllRead")}
              </button>
            )}
          </div>

          {notifications.isLoading ? (
            <div className="flex justify-center py-6">
              <Spinner className="h-5 w-5" />
            </div>
          ) : items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-gray-400">
              {t("notifications.empty")}
            </p>
          ) : (
            items.map((notification) => {
              const link = notificationLink(notification);
              return (
                <Link
                  key={notification.id}
                  to={link.to}
                  params={link.params}
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    if (!notification.read) markRead.mutate(notification.id);
                  }}
                  className={cn(
                    "flex items-start gap-2 px-3 py-2.5 text-sm hover:bg-white/5 transition",
                    notification.read ? "text-gray-400" : "text-gray-100 bg-white/5",
                  )}
                >
                  {notification.type === "comment" ? (
                    <MessageSquare size={16} className="mt-0.5 shrink-0 text-dourado" />
                  ) : (
                    <UserPlus size={16} className="mt-0.5 shrink-0 text-dourado" />
                  )}
                  <span className="flex-1">
                    {t(`notifications.${notification.type}`, {
                      name: notification.actorDisplayName,
                    })}
                    <span className="block text-xs text-gray-500">
                      {formatDate(notification.createdAt, i18n.language)}
                    </span>
                  </span>
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
