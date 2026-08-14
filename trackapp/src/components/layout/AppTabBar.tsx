import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
// Tipo vem do próprio expo-router (não de @react-navigation/bottom-tabs direto)
// — o Expo Router usa uma versão vendorizada/ajustada desses tipos, e a do
// pacote puro não bate estruturalmente com o que `<Tabs tabBar={...}>` espera.
import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import type { NavigationRoute, ParamListBase } from "@react-navigation/native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Home, ListMusic, LogOut, Search, Settings, Sparkles, Trophy, User } from "lucide-react-native";
import { router } from "expo-router";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useLogoutMutation } from "@/queries/auth";
import { colors } from "@/lib/colors";
import { cn } from "@/lib/cn";

/**
 * Porta 1:1 da bottom tab bar do web (src/shared/layout/AppSidebar.tsx,
 * linhas 239-335 — `<nav className="md:hidden fixed bottom-0 ...">`). Web tem
 * variante desktop (sidebar lateral) e mobile (esta) — RN só roda em
 * telefone, então só a variante mobile porta. Mesmos 5 ícones/rotas +
 * 6º slot de Perfil (botão que abre menu, não é rota/Link — mesma decisão do
 * web original).
 */
const TAB_ROUTES = [
  { name: "feed", label: "Feed", icon: Home },
  { name: "search", label: "Buscar", icon: Search },
  { name: "discover/index", label: "Descobrir", icon: Sparkles },
  { name: "my-rankings", label: "Minhas avaliações", icon: ListMusic },
  { name: "top-albums/index", label: "Top álbuns", icon: Trophy },
] as const;

const TAB_COUNT = TAB_ROUTES.length + 1; // +1 = slot do Perfil (não é rota)

const EASE = Easing.bezier(0.16, 1, 0.3, 1);

export function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const logoutMutation = useLogoutMutation();
  const indicatorX = useSharedValue(state.index * (100 / TAB_COUNT));

  useEffect(() => {
    indicatorX.value = withTiming(state.index * (100 / TAB_COUNT), { duration: 300, easing: EASE });
  }, [state.index, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    width: `${100 / TAB_COUNT}%`,
    transform: [{ translateX: `${indicatorX.value}%` }],
  }));

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    await logoutMutation.mutateAsync();
    router.replace("/login");
  };

  return (
    <View
      className="flex-row border-t border-white/10 bg-cinza-escuro"
      style={{ paddingBottom: insets.bottom }}
    >
      <Animated.View className="absolute top-0 h-0.5 rounded-full bg-dourado" style={indicatorStyle} />

      {state.routes.map((route: NavigationRoute<ParamListBase, string>, index: number) => {
        const config = TAB_ROUTES.find((t) => t.name === route.name);
        if (!config) return null;
        const isFocused = state.index === index;
        const Icon = config.icon;

        return (
          <Pressable
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            className="flex-1 items-center justify-center gap-0.5 py-2.5"
          >
            <Icon size={22} color={isFocused ? colors.dourado : "#9ca3af"} />
            {isFocused && <Text className="text-[10px] text-dourado">{config.label}</Text>}
          </Pressable>
        );
      })}

      <Pressable
        onPress={() => setProfileMenuOpen(true)}
        className="flex-1 items-center justify-center gap-0.5 py-2.5"
      >
        <User size={22} color="#9ca3af" />
      </Pressable>

      <BottomSheet open={profileMenuOpen} onOpenChange={setProfileMenuOpen} title="Menu">
        <View className="gap-1">
          <MenuItem
            icon={<User size={18} color={colors.offwhite} />}
            label="Meu perfil"
            onPress={() => setProfileMenuOpen(false)}
          />
          <MenuItem
            icon={<Settings size={18} color={colors.offwhite} />}
            label="Configurações"
            onPress={() => setProfileMenuOpen(false)}
          />
          <MenuItem
            icon={<LogOut size={18} color="#f87171" />}
            label="Sair"
            danger
            onPress={handleLogout}
          />
        </View>
      </BottomSheet>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-2 rounded-lg px-3 py-2.5">
      {icon}
      <Text className={cn("flex-1 text-base", danger ? "text-red-400" : "text-gray-200")}>{label}</Text>
    </Pressable>
  );
}
