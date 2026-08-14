import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Bell, MessageSquare, UserPlus } from "lucide-react-native";
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
  useUnreadCountQuery,
} from "@/queries/notifications";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/cn";
import { colors } from "@/lib/colors";
import type { NotificationView } from "@/shared/api/types";

/**
 * UI nova, sem equivalente na variante mobile do web (lá o sino só existe no
 * `AppHeader` desktop-only — decisão explícita do usuário de ter isso no app
 * mesmo assim, ver trackapp/plan.md Fase 6). Lógica de dados (queries,
 * mark-read, badge) é 1:1 com `NotificationsBell.tsx` do web; só o
 * continente visual (botão + BottomSheet em vez de dropdown) é novo.
 */
const BADGE_CAP = 9;

function notificationHref(notification: NotificationView): string {
  if (notification.type === "comment" && notification.albumId) {
    return `/profile/${notification.actorId}/album/${notification.albumId}`;
  }
  return `/profile/${notification.actorId}`;
}

export function NotificationsBell() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const unreadCount = useUnreadCountQuery();
  const notifications = useNotificationsQuery(open);
  const markRead = useMarkNotificationReadMutation();
  const markAllRead = useMarkAllNotificationsReadMutation();

  const count = unreadCount.data ?? 0;
  const items = notifications.data?.data ?? [];

  return (
    <>
      <Pressable onPress={() => setOpen(true)} className="relative h-9 w-9 items-center justify-center">
        <Bell size={22} color={colors.offwhite} />
        {count > 0 && (
          <View className="absolute -right-1 -top-1 h-5 min-w-5 items-center justify-center rounded-full bg-dourado px-1">
            <Text className="text-xs font-bold text-grafite">{count > BADGE_CAP ? `${BADGE_CAP}+` : count}</Text>
          </View>
        )}
      </Pressable>

      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title={t("notifications.title")}
        actions={
          count > 0 ? (
            <Pressable onPress={() => markAllRead.mutate()}>
              <Text className="text-xs text-dourado">{t("notifications.markAllRead")}</Text>
            </Pressable>
          ) : undefined
        }
      >
        {notifications.isLoading ? (
          <View className="items-center py-6">
            <Spinner size={20} />
          </View>
        ) : items.length === 0 ? (
          <EmptyState title={t("notifications.empty")} />
        ) : (
          <View className="gap-1">
            {items.map((notification) => (
              <Pressable
                key={notification.id}
                onPress={() => {
                  setOpen(false);
                  if (!notification.read) markRead.mutate(notification.id);
                  router.push(notificationHref(notification));
                }}
                className={cn(
                  "flex-row items-start gap-2 rounded-lg px-2 py-2.5",
                  !notification.read && "bg-white/5",
                )}
              >
                {notification.type === "comment" ? (
                  <MessageSquare size={16} color={colors.dourado} />
                ) : (
                  <UserPlus size={16} color={colors.dourado} />
                )}
                <View className="flex-1">
                  <Text className={cn("text-sm", notification.read ? "text-gray-400" : "text-gray-100")}>
                    {t(`notifications.${notification.type}`, { name: notification.actorDisplayName })}
                  </Text>
                  <Text className="mt-0.5 text-xs text-gray-500">
                    {formatDate(notification.createdAt, i18n.language)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </BottomSheet>
    </>
  );
}
