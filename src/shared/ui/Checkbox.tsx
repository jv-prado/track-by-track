import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/shared/lib/cn";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
}

/**
 * Input nativo (`peer`) com o quadrado desenhado ao lado: mantém teclado,
 * leitor de tela e o estado `:checked` de graça, sem `role="checkbox"` na mão.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, ...props }, ref) => (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition hover:border-dourado/40 hover:bg-white/8",
        className,
      )}
    >
      <input ref={ref} type="checkbox" className="peer sr-only" {...props} />
      <span className="flex size-5 shrink-0 items-center justify-center rounded-md border border-white/25 text-transparent transition peer-checked:border-dourado peer-checked:bg-dourado peer-checked:text-grafite peer-focus-visible:ring-2 peer-focus-visible:ring-dourado peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-grafite">
        <Check size={14} strokeWidth={3} />
      </span>
      <span className="min-w-0 text-sm font-medium text-white">{label}</span>
    </label>
  ),
);
Checkbox.displayName = "Checkbox";
