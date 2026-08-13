import { type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/cn";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Modal({ open, onOpenChange, title, description, children, footer, className }: ModalProps) {
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
            // mobile: bottom sheet (mesmo padrão do Sheet) — melhor que modal centralizado no toque
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] w-full flex-col gap-4 rounded-t-2xl border-t border-white/10 bg-grafite p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl shadow-black/50",
            "data-[state=open]:animate-sheet-up-in data-[state=closed]:animate-sheet-up-out",
            // sm+: volta a ser o modal centralizado
            "sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:h-auto sm:max-h-none sm:w-[calc(100%-2rem)] sm:max-w-sm sm:rounded-2xl sm:border sm:border-t sm:pb-5",
            "sm:data-[state=open]:animate-modal-in sm:data-[state=closed]:animate-modal-out",
            className,
          )}
        >
          <div className="mx-auto h-1.5 w-10 shrink-0 rounded-full bg-white/15 sm:hidden" />
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1 min-w-0">
              <Dialog.Title className="text-white font-semibold text-lg">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="text-gray-400 text-sm">{description}</Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white transition cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>
          {children}
          {footer && <div className="flex justify-end gap-2">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
