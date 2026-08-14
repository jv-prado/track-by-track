import { forwardRef, type ElementRef } from "react";
import { View, type ViewProps } from "react-native";
import { cn } from "@/lib/cn";

// Porta 1:1 de src/shared/ui/Card.tsx (web).
export const Card = forwardRef<ElementRef<typeof View>, ViewProps>(
  ({ className, ...props }, ref) => (
    <View
      ref={ref}
      className={cn("rounded-xl border border-white/10 bg-cinza-escuro p-4", className)}
      {...props}
    />
  ),
);
Card.displayName = "Card";
