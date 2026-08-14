import "../global.css";

import { Suspense, useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActivityIndicator, View } from "react-native";

import { FONT_ASSETS } from "@/lib/fonts";
import { colors } from "@/lib/colors";
import { queryClient } from "./query-client";
import { useSessionQuery } from "@/queries/auth";
import { Toaster } from "@/components/ui/Toast";

SplashScreen.preventAutoHideAsync();

function SessionSplash() {
  return (
    <View className="flex-1 items-center justify-center bg-grafite">
      <ActivityIndicator color={colors.dourado} />
    </View>
  );
}

/**
 * Porta de AppRouter (web, src/app/providers.tsx) — só monta a navegação
 * depois que a sessão foi reidratada a partir do refresh token salvo (ver
 * useSessionQuery). Sem esse gate a árvore montaria deslogada por um
 * instante e um guard de rota chutaria usuário autenticado pro /login.
 */
function SessionGate({ children }: { children: React.ReactNode }) {
  useSessionQuery();
  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Suspense fallback={<SessionSplash />}>
            <SessionGate>
              <Stack screenOptions={{ headerShown: false }} />
            </SessionGate>
          </Suspense>
          <Toaster />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
