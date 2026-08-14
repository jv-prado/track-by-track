import { Redirect } from "expo-router";
import { Tabs } from "expo-router";
import { useAuthStore } from "@/shared/auth/auth.store";
import { AppTabBar } from "@/components/layout/AppTabBar";

/**
 * Equivalente de src/routes/_app.tsx (web) — guard real (beforeLoad lá,
 * Redirect aqui) + shell autenticado. Web usa sidebar/tab bar responsiva
 * (AppSidebar.tsx); aqui é sempre a tab bar (ver AppTabBar.tsx).
 */
export default function AppLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs tabBar={(props) => <AppTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="discover" />
      <Tabs.Screen name="my-rankings" />
      <Tabs.Screen name="top-albums" />
      {/* Fora da tab bar (href: null) — alcançadas pelo menu de Perfil ou por
          links dentro de outras telas, mas continuam dentro do Tabs pra tab
          bar (AppTabBar) ficar visível, igual ao _app.tsx persistente do web. */}
      <Tabs.Screen name="profile/index" options={{ href: null }} />
      <Tabs.Screen name="profile/[userId]/index" options={{ href: null }} />
      <Tabs.Screen name="profile/[userId]/album/[albumId]" options={{ href: null }} />
      <Tabs.Screen name="album/[albumId]" options={{ href: null }} />
      <Tabs.Screen name="delete-account" options={{ href: null }} />
    </Tabs>
  );
}
