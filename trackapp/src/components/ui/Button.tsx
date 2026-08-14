import { forwardRef, type ElementRef, type ReactNode } from "react";
import { Pressable, Text, type PressableProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

/**
 * Porta 1:1 de src/shared/ui/Button.tsx (web). Mesmas variantes/cores/tamanhos
 * — só troca `hover:` (não existe em touch) por `active:` (feedback de
 * pressionar, equivalente mobile do hover), mesmos valores de cor.
 */
const buttonVariants = cva(
  "flex-row items-center justify-center gap-2 rounded-lg disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-roxo active:bg-roxo-vivo",
        secondary: "bg-cinza-medio active:bg-cinza-medio/80",
        ghost: "bg-transparent active:bg-white/10",
        outline: "bg-transparent border border-white/15 active:border-dourado/60",
        danger: "bg-red-500/15 border border-red-500/30 active:bg-red-500/25",
        accent: "bg-dourado active:bg-dourado-claro",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-10 px-4",
        lg: "h-11 px-6",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

const textVariants = cva("font-semibold text-center", {
  variants: {
    variant: {
      primary: "text-white",
      secondary: "text-white",
      ghost: "text-white",
      outline: "text-white",
      danger: "text-red-400",
      accent: "text-grafite",
    },
    size: {
      sm: "text-sm",
      md: "text-sm",
      lg: "text-base",
    },
  },
  defaultVariants: { variant: "primary", size: "md" },
});

export interface ButtonProps
  extends Omit<PressableProps, "children">,
    VariantProps<typeof buttonVariants> {
  className?: string;
  /**
   * String vira `<Text>` automático (RN não aceita texto solto fora de
   * `<Text>`, diferente do HTML) — passa um ReactNode pronto (ex: só um
   * ícone, como em `Pagination`) pra um botão sem label.
   */
  children: ReactNode;
  /**
   * Ação sem update otimista (delete, reset, salvar, login...) — troca o ícone
   * por spinner e desabilita. Mesma regra do web: não usar em ação que já
   * muda a UI no toque (estrela, seguir), aí seria regressão, não feedback.
   */
  isLoading?: boolean;
}

export const Button = forwardRef<ElementRef<typeof Pressable>, ButtonProps>(
  ({ className, variant, size, isLoading, disabled, children, ...props }, ref) => (
    <Pressable
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled ?? isLoading}
      accessibilityState={{ disabled: disabled ?? isLoading, busy: isLoading }}
      {...props}
    >
      {isLoading && <Spinner size={16} />}
      {typeof children === "string" ? (
        <Text className={textVariants({ variant, size })}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  ),
);
Button.displayName = "Button";
