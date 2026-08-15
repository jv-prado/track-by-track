import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/shared/lib/cn";

const THRESHOLD = 70;
const MAX_PULL = 110;
const RESISTANCE = 0.5;

// Gesto custom porque overscroll-behavior:none (index.css) desliga de propósito o
// pull-to-refresh nativo do Chrome/Safari — era necessário pro Radix medir a
// scrollbar certo (ver comentário em index.css). Sem isso, puxar pra baixo no topo
// da página não faz nada.
export function PullToRefresh() {
  const queryClient = useQueryClient();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (window.scrollY <= 0 && !refreshing) {
        startY.current = e.touches[0]?.clientY ?? null;
        pulling.current = false;
      } else {
        startY.current = null;
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (startY.current === null || refreshing) return;
      const currentY = e.touches[0]?.clientY ?? startY.current;
      const diff = currentY - startY.current;
      if (diff <= 0 || window.scrollY > 0) {
        setPull(0);
        pulling.current = false;
        return;
      }
      pulling.current = true;
      e.preventDefault();
      setPull(Math.min(diff * RESISTANCE, MAX_PULL));
    }

    async function onTouchEnd() {
      if (!pulling.current) {
        startY.current = null;
        return;
      }
      pulling.current = false;
      startY.current = null;
      if (pull >= THRESHOLD) {
        setRefreshing(true);
        setPull(THRESHOLD);
        try {
          // invalidateQueries (sem filtro) marca TODO cache como stale, não só o
          // ativo — refetchQueries sozinho deixava query fora de tela (ex: outra
          // aba/rota) com dado velho até o usuário voltar pra ela.
          await queryClient.invalidateQueries();
        } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [pull, refreshing, queryClient]);

  const active = pull > 0 || refreshing;
  const progress = Math.min(pull / THRESHOLD, 1);

  return (
    <div
      aria-hidden={!active}
      className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center overflow-hidden"
      style={{
        height: active ? Math.max(pull, refreshing ? THRESHOLD : 0) : 0,
        transition: pulling.current ? "none" : "height 200ms ease-out",
      }}
    >
      <div
        className="flex items-center justify-center rounded-full bg-cinza-escuro border border-white/10 shadow-lg shadow-black/40 w-9 h-9 mt-3"
        style={{
          opacity: progress,
          transform: `scale(${0.6 + progress * 0.4})`,
        }}
      >
        <RefreshCw
          size={18}
          className={cn("text-dourado", refreshing && "animate-spin")}
          style={
            refreshing
              ? undefined
              : { transform: `rotate(${progress * 180}deg)` }
          }
        />
      </div>
    </div>
  );
}
