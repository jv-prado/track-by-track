import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export type SelectSize = "sm" | "md" | "lg";

const triggerSizeClasses: Record<SelectSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-3 text-sm",
  lg: "h-11 px-4 text-base",
};

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
  placeholder?: string;
  size?: SelectSize;
  icon?: ReactNode;
  /** Abaixo de `sm`, mostra só o ícone (botão quadrado) — texto e chevron somem, dropdown continua igual. */
  mobileIconOnly?: boolean;
  /** Sempre só o ícone (botão quadrado), em qualquer breakpoint — dropdown continua igual. */
  iconOnly?: boolean;
}

interface DropdownRect {
  top: number;
  left: number;
  width: number;
}

export function Select({
  value,
  onChange,
  options,
  className,
  placeholder,
  size = "md",
  icon,
  mobileIconOnly = false,
  iconOnly = false,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DropdownRect | null>(null);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches,
  );
  const triggerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Abaixo de `sm`, dropdown flutuante vira bottom sheet — trigger `mobileIconOnly` é
  // um botão de 40px, e um dropdown com a largura do trigger não cabe o texto das opções.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Dropdown vive num portal em document.body: preso a `position: fixed` calculado a partir
  // do trigger, em vez de `absolute` dentro do fluxo normal — assim ele nunca é cortado por
  // um ancestral com `overflow-hidden` nem perde pro stacking context de alguma seção mais
  // abaixo na página (ambos os problemas já apareceram com o dropdown absolute antigo).
  useEffect(() => {
    if (!open) return;

    const updateRect = () => {
      const bounds = triggerRef.current?.getBoundingClientRect();
      if (!bounds) return;
      setRect({ top: bounds.bottom + 4, left: bounds.left, width: bounds.width });
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [open]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((option) => option.value === value);

  return (
    <div className={cn("relative", className)} ref={triggerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex items-center justify-center gap-2 bg-cinza-medio/40 border border-white/10 rounded-lg text-white transition-colors focus:outline-none focus:ring-2 focus:ring-dourado focus:border-dourado/60 cursor-pointer",
          iconOnly
            ? "h-10 w-10 shrink-0"
            : mobileIconOnly
              ? "h-10 w-10 shrink-0 sm:h-auto sm:w-full sm:justify-between"
              : "w-full justify-between",
          triggerSizeClasses[size],
        )}
      >
        {icon && <span className="shrink-0 text-gray-500">{icon}</span>}
        <span
          className={cn(
            "flex-1 truncate text-left",
            !selected && "text-gray-500",
            iconOnly ? "hidden" : mobileIconOnly && "hidden sm:inline",
          )}
        >
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            "shrink-0 text-gray-500 transition-transform",
            open && "rotate-180",
            iconOnly ? "hidden" : mobileIconOnly && "hidden sm:inline",
          )}
        />
      </button>

      {open && isMobile &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end bg-black/60">
            <div
              ref={listRef}
              role="listbox"
              className="w-full max-h-[70vh] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-cinza-escuro pb-[env(safe-area-inset-bottom)] shadow-lg shadow-black/40"
            >
              <div className="sticky top-0 flex items-center justify-between border-b border-white/10 bg-cinza-escuro px-4 py-3">
                <span className="text-base font-semibold text-white">{placeholder}</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-sm text-gray-400"
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  disabled={option.disabled}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-4 py-3 text-left text-base transition cursor-pointer",
                    option.disabled
                      ? "text-gray-600 cursor-not-allowed"
                      : option.value === value
                        ? "text-dourado hover:bg-white/5"
                        : "text-gray-200 hover:bg-white/5",
                  )}
                >
                  <span className="flex-1 truncate">{option.label}</span>
                  {option.value === value && <Check size={16} className="shrink-0" />}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}

      {open && !isMobile && rect &&
        createPortal(
          <div
            ref={listRef}
            role="listbox"
            style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width }}
            className="z-50 max-h-60 overflow-y-auto rounded-lg border border-white/10 bg-cinza-escuro shadow-lg shadow-black/40"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                disabled={option.disabled}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition cursor-pointer",
                  option.disabled
                    ? "text-gray-600 cursor-not-allowed"
                    : option.value === value
                      ? "text-dourado hover:bg-white/5"
                      : "text-gray-200 hover:bg-white/5",
                )}
              >
                <span className="flex-1 truncate">{option.label}</span>
                {option.value === value && <Check size={14} className="shrink-0" />}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
