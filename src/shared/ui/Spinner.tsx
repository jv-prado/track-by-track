import { Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("animate-spin text-dourado", className)} />;
}
