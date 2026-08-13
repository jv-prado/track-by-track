import { type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/cn";

const iconVariants = cva("flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 rounded-lg shrink-0", {
  variants: {
    accent: {
      roxo: "bg-roxo-vivo/15 text-roxo-vivo",
      dourado: "bg-dourado/15 text-dourado",
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
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-white/10 bg-cinza-escuro p-3 sm:p-4",
        className,
      )}
    >
      <div className={iconVariants({ accent })}>{icon}</div>
      <div className="min-w-0">
        <p className="text-white text-lg sm:text-xl font-bold leading-tight truncate">{value}</p>
        <p className="text-gray-500 text-xs truncate">{label}</p>
      </div>
    </div>
  );
}
