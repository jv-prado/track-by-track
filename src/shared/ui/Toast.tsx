import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { subscribe, getSnapshot, dismissToast, type ToastVariant } from "./toast-store";

const variantStyles: Record<ToastVariant, { icon: typeof CheckCircle2; classes: string }> = {
  success: { icon: CheckCircle2, classes: "border-l-green-500 text-green-400" },
  error: { icon: XCircle, classes: "border-l-red-500 text-red-400" },
};

export function Toaster() {
  const items = useSyncExternalStore(subscribe, getSnapshot);

  if (items.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 left-4 z-[100] flex flex-col items-end gap-2 sm:bottom-4 sm:left-auto sm:w-80">
      {items.map((item) => {
        const { icon: Icon, classes } = variantStyles[item.variant];
        return (
          <div
            key={item.id}
            role="status"
            className={cn(
              "flex w-full items-start gap-2.5 rounded-xl border border-white/10 border-l-4 bg-cinza-escuro p-3 shadow-lg shadow-black/50 animate-toast-in",
              classes,
            )}
          >
            <Icon size={18} className="shrink-0 mt-0.5" />
            <p className="flex-1 text-sm text-white">{item.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(item.id)}
              className="text-gray-400 hover:text-white transition cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
