import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/cn";

const inputVariants = cva(
  "w-full bg-cinza-medio/40 border border-white/10 rounded-lg text-white placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-1 focus:ring-dourado/50 focus:border-dourado/60",
  {
    variants: {
      uiSize: {
        sm: "h-9 px-3 text-base sm:text-sm",
        md: "h-10 px-3 text-base sm:text-sm",
        lg: "h-11 px-4 text-base",
      },
    },
    defaultVariants: { uiSize: "md" },
  },
);

const iconPadding = {
  sm: "pl-8",
  md: "pl-9",
  lg: "pl-10",
} as const;

const iconOffset = {
  sm: "left-2.5",
  md: "left-3",
  lg: "left-3.5",
} as const;

export interface InputProps
  extends InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  icon?: ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, containerClassName, icon, uiSize, ...props }, ref) => {
    const resolvedSize = uiSize ?? "md";

    if (!icon) {
      return (
        <input
          ref={ref}
          className={cn(inputVariants({ uiSize }), className)}
          {...props}
        />
      );
    }

    return (
      <div className={cn("relative", containerClassName)}>
        <span
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-500",
            iconOffset[resolvedSize],
          )}
        >
          {icon}
        </span>
        <input
          ref={ref}
          className={cn(inputVariants({ uiSize }), iconPadding[resolvedSize], className)}
          {...props}
        />
      </div>
    );
  },
);
Input.displayName = "Input";
