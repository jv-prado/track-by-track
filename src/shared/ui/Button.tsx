import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dourado focus-visible:ring-offset-2 focus-visible:ring-offset-grafite",
  {
    variants: {
      variant: {
        primary: "bg-roxo text-white hover:bg-roxo-vivo",
        secondary: "bg-cinza-medio text-white hover:bg-cinza-medio/80",
        ghost: "bg-transparent text-white hover:bg-white/10",
        outline: "bg-transparent text-white border border-white/15 hover:border-dourado/60 hover:text-dourado",
        danger: "bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25",
        accent: "bg-dourado text-grafite hover:bg-dourado-claro",
      },
      size: {
        sm: "h-9 px-3 text-sm gap-1.5",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-6 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";
