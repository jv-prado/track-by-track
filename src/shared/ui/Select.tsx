import { useEffect, useRef, useState } from "react";
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
}

interface DropdownRect {
  top: number;
  left: number;
  width: number;
}

export function Select({ value, onChange, options, className, placeholder, size = "md" }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DropdownRect | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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
          "w-full flex items-center justify-between gap-2 bg-cinza-medio/40 border border-white/10 rounded-lg text-white transition-colors focus:outline-none focus:ring-2 focus:ring-dourado focus:border-dourado/60 cursor-pointer",
          triggerSizeClasses[size],
        )}
      >
        <span className={cn("truncate", !selected && "text-gray-500")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown size={16} className={cn("shrink-0 text-gray-500 transition-transform", open && "rotate-180")} />
      </button>

      {open && rect &&
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
