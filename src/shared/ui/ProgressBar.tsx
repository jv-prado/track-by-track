import { cn } from "@/shared/lib/cn";

export interface ProgressBarProps {
  /** 0–100. Fora desse intervalo é grampeado (clamp). */
  value: number;
  /** controla altura/track — sobrescreve o `h-1.5` default via twMerge. */
  className?: string;
}

// Cor única de progresso do produto (gradiente roxo → dourado) — usada tanto no
// header do álbum (grande) quanto nos cards de ranking (pequeno). Não duplicar
// esse gradiente inline em outro lugar; mudar aqui muda em todo o app.
export function ProgressBar({ value, className }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("h-1.5 rounded-full bg-white/10 overflow-hidden", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-roxo-vivo to-dourado transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
