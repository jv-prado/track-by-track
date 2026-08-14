import { type ReactNode } from "react";
import { Text, View } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

// Porta 1:1 de src/shared/ui/StatCard.tsx (web).
const iconVariants = cva("h-10 w-10 items-center justify-center rounded-lg", {
  variants: {
    accent: {
      roxo: "bg-roxo-vivo/15",
      dourado: "bg-dourado/15",
    },
  },
  defaultVariants: { accent: "dourado" },
});

export interface StatCardProps extends VariantProps<typeof iconVariants> {
  icon: ReactNode;
  value: ReactNode;
  label: string;
  className?: string;
}

export function StatCard({ icon, value, label, accent, className }: StatCardProps) {
  return (
    <View
      className={cn(
        "flex-row items-center gap-3 rounded-xl border border-white/10 bg-cinza-escuro p-3",
        className,
      )}
    >
      <View className={iconVariants({ accent })}>{icon}</View>
      <View className="min-w-0 flex-1">
        <Text className="text-lg font-bold leading-tight text-white" numberOfLines={1}>
          {value}
        </Text>
        <Text className="text-xs text-gray-500" numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}
