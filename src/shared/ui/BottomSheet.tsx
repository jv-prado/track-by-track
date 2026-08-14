import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/cn";

// Distância mínima (px) ou velocidade (px/ms) de arrasto pra soltar e fechar
// em vez de voltar pro lugar — valores sentidos ao toque, não deduzidos.
const CLOSE_DISTANCE_PX = 120;
const CLOSE_VELOCITY_PX_MS = 0.5;

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** Ações extras no header, entre o título e o botão de fechar (ex: compartilhar). */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function BottomSheet({
  open,
  onOpenChange,
  title,
  actions,
  children,
  className,
}: BottomSheetProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; startTime: number } | null>(null);

  // Arrastar pra fechar só existe no layout mobile (bottom sheet); no drawer
  // lateral de sm+ pra cima, arrastar não faz sentido geométrico.
  const isMobileLayout = () =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches;

  function handleDragStart(e: ReactPointerEvent<HTMLDivElement>) {
    if (!isMobileLayout()) return;
    // não inicia arrasto a partir de um botão do header (fechar, ações) —
    // esses continuam funcionando como clique normal.
    if ((e.target as HTMLElement).closest("button")) return;
    dragRef.current = { startY: e.clientY, startTime: Date.now() };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleDragMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const content = contentRef.current;
    if (!drag || !content) return;
    const delta = Math.max(0, e.clientY - drag.startY);
    // !important: sobrepõe o transform que a animação de entrada (fill: both)
    // deixa aplicado no elemento — inline style comum perde pra CSS animation.
    content.style.setProperty("transform", `translateY(${delta}px)`, "important");
    content.style.setProperty("transition", "none", "important");
  }

  function handleDragEnd(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const content = contentRef.current;
    if (!drag || !content) return;
    dragRef.current = null;
    const delta = Math.max(0, e.clientY - drag.startY);
    const elapsed = Date.now() - drag.startTime;
    const velocity = delta / Math.max(elapsed, 1);

    if (delta > CLOSE_DISTANCE_PX || velocity > CLOSE_VELOCITY_PX_MS) {
      content.style.removeProperty("transform");
      content.style.removeProperty("transition");
      onOpenChange(false);
      return;
    }

    // não soltou o suficiente: anima de volta pro lugar e devolve o controle
    // do transform pras classes de animação depois que a transição termina.
    content.style.setProperty("transition", "transform 200ms cubic-bezier(0.4, 0, 0.2, 1)", "important");
    content.style.setProperty("transform", "translateY(0px)", "important");
    window.setTimeout(() => {
      content.style.removeProperty("transform");
      content.style.removeProperty("transition");
    }, 200);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-40 bg-black/60",
            "data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out",
          )}
        />
        <Dialog.Content
          ref={contentRef}
          className={cn(
            // mobile: bottom sheet (desliza de baixo, cantos arredondados, altura pelo conteúdo)
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl border-t border-white/10 bg-grafite shadow-2xl shadow-black/50",
            "data-[state=open]:animate-sheet-up-in data-[state=closed]:animate-sheet-up-out",
            // sm+: volta a ser o drawer lateral, deslizando da direita
            "sm:inset-x-auto sm:top-0 sm:right-0 sm:bottom-auto sm:h-full sm:max-h-none sm:w-full sm:max-w-md sm:rounded-t-none sm:border-t-0 sm:border-l",
            "sm:data-[state=open]:animate-sheet-in sm:data-[state=closed]:animate-sheet-out",
            className,
          )}
        >
          {/* handle + header: única região que arrasta pra fechar no mobile — o
              corpo abaixo precisa rolar livre, então fica de fora do gesto. */}
          <div
            className="shrink-0 touch-none sm:touch-auto"
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
          >
            <div className="mx-auto mt-3 h-1 w-9 rounded-full bg-white/15 sm:hidden" />
            <div className="flex items-center justify-between gap-2 px-5 pt-4 pb-3">
              <Dialog.Title className="text-white font-semibold text-base">{title}</Dialog.Title>
              <div className="flex items-center gap-1 shrink-0">
                {actions}
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-full p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </Dialog.Close>
              </div>
            </div>
            <div className="border-b border-white/5" />
          </div>
          {/* p-1 -m-1: dá espaço pro focus ring dentro da área de scroll sem
              deslocar o conteúdo — sem isso, o ring de um campo encostado no
              topo é cortado pelo `overflow-y-auto` ao rolar até ele. */}
          <div className="min-h-0 flex-1 overflow-y-auto -m-1 p-1 px-5 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
