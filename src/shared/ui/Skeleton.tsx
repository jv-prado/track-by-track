import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export const Skeleton = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("animate-pulse rounded-lg bg-white/5", className)} {...props} />
  ),
);
Skeleton.displayName = "Skeleton";
