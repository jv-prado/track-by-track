import { useSyncExternalStore } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle2, XCircle, X } from "lucide-react-native";
import { colors } from "@/lib/colors";
import { subscribe, getSnapshot, dismissToast, type ToastVariant } from "./toast-store";

/**
 * Porta de src/shared/ui/Toast.tsx (web, via createPortal/document.body) — RN
 * não tem portal de DOM, então isso é montado direto no `_layout.tsx` raiz
 * (fica por cima de tudo pela ordem de render, mesmo efeito visual do portal).
 */
const variantStyles: Record<ToastVariant, { icon: typeof CheckCircle2; color: string; border: string }> = {
  success: { icon: CheckCircle2, color: "#22c55e", border: "border-l-green-500" },
  error: { icon: XCircle, color: "#f87171", border: "border-l-red-500" },
};

export function Toaster() {
  const items = useSyncExternalStore(subscribe, getSnapshot);
  const insets = useSafeAreaInsets();

  if (items.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-4 z-50 gap-2"
      style={{ bottom: insets.bottom + 72 }}
    >
      {items.map((item) => {
        const { icon: Icon, color, border } = variantStyles[item.variant];
        return (
          <View
            key={item.id}
            className={`flex-row items-start gap-2.5 rounded-xl border border-white/10 border-l-4 bg-cinza-escuro p-3 ${border}`}
          >
            <Icon size={18} color={color} />
            <Text className="flex-1 text-sm text-white">{item.message}</Text>
            <Pressable onPress={() => dismissToast(item.id)}>
              <X size={14} color={colors.cinzaClaro} />
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
