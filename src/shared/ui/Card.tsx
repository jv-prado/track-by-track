import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-xl border border-white/10 bg-cinza-escuro p-4", className)}
      {...props}
    />
  ),
);
Card.displayName = "Card";
