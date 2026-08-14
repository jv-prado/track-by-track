import { View, type ViewProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { cn } from "@/lib/cn";
import { colors } from "@/lib/colors";

/**
 * Porta 1:1 de src/shared/ui/ProgressBar.tsx (web) — mesmo gradiente
 * roxo-vivo → dourado (RN não tem `bg-gradient-to-r` do Tailwind, usa
 * expo-linear-gradient pro mesmo resultado visual). Cor única de progresso
 * do produto — não duplicar esse gradiente inline em outro lugar.
 */
export interface ProgressBarProps extends ViewProps {
  /** 0–100. Fora desse intervalo é grampeado (clamp). */
  value: number;
  className?: string;
}

export function ProgressBar({ value, className, ...props }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));

  return (
    <View className={cn("h-1.5 overflow-hidden rounded-full bg-white/10", className)} {...props}>
      <LinearGradient
        colors={[colors.roxoVivo, colors.dourado]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ height: "100%", width: `${pct}%`, borderRadius: 9999 }}
      />
    </View>
  );
}
