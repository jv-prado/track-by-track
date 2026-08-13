import { type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/cn";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** Ações extras no header, entre o título e o botão de fechar (ex: compartilhar). */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Sheet({ open, onOpenChange, title, actions, children, className }: SheetProps) {
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
          className={cn(
            // mobile: bottom sheet (desliza de baixo, cantos arredondados, altura pelo conteúdo)
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] w-full flex-col gap-4 rounded-t-2xl border-t border-white/10 bg-grafite p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl shadow-black/50",
            "data-[state=open]:animate-sheet-up-in data-[state=closed]:animate-sheet-up-out",
            // sm+: volta a ser o drawer lateral, deslizando da direita
            "sm:inset-x-auto sm:top-0 sm:right-0 sm:bottom-auto sm:h-full sm:max-h-none sm:w-full sm:max-w-md sm:rounded-t-none sm:border-t-0 sm:border-l sm:pb-5",
            "sm:data-[state=open]:animate-sheet-in sm:data-[state=closed]:animate-sheet-out",
            className,
          )}
        >
          <div className="mx-auto h-1.5 w-10 shrink-0 rounded-full bg-white/15 sm:hidden" />
          <div className="flex items-center justify-between gap-2">
            <Dialog.Title className="text-white font-semibold text-lg">{title}</Dialog.Title>
            <div className="flex items-center gap-1 shrink-0">
              {actions}
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>
          </div>
          {/* p-1 -m-1: dá espaço pro focus ring dentro da área de scroll sem
              deslocar o conteúdo — sem isso, o ring de um campo encostado no
              topo é cortado pelo `overflow-y-auto` ao rolar até ele. */}
          <div className="min-h-0 flex-1 overflow-y-auto -m-1 p-1">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
