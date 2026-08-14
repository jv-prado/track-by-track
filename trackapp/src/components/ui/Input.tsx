import { forwardRef, type ElementRef, type ReactNode } from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

// Porta 1:1 de src/shared/ui/Input.tsx (web) — mesmas variantes de tamanho,
// mesmo suporte a ícone à esquerda.
const inputVariants = cva(
  "w-full bg-cinza-medio/40 border border-white/10 rounded-lg text-white",
  {
    variants: {
      uiSize: {
        sm: "h-9 px-3 text-sm",
        md: "h-10 px-3 text-sm",
        lg: "h-11 px-4 text-base",
      },
    },
    defaultVariants: { uiSize: "md" },
  },
);

const iconPadding = { sm: "pl-8", md: "pl-9", lg: "pl-10" } as const;
const iconOffset = { sm: "left-2.5", md: "left-3", lg: "left-3.5" } as const;

export interface InputProps
  extends TextInputProps,
    VariantProps<typeof inputVariants> {
  icon?: ReactNode;
  containerClassName?: string;
  className?: string;
}

export const Input = forwardRef<ElementRef<typeof TextInput>, InputProps>(
  ({ className, containerClassName, icon, uiSize, ...props }, ref) => {
    const resolvedSize = uiSize ?? "md";

    if (!icon) {
      return (
        <TextInput
          ref={ref}
          className={cn(inputVariants({ uiSize }), className)}
          placeholderTextColor="#9ca3af"
          {...props}
        />
      );
    }

    return (
      <View className={cn("relative", containerClassName)}>
        <View
          pointerEvents="none"
          className={cn("absolute top-0 bottom-0 justify-center z-10", iconOffset[resolvedSize])}
        >
          {icon}
        </View>
        <TextInput
          ref={ref}
          className={cn(inputVariants({ uiSize }), iconPadding[resolvedSize], className)}
          placeholderTextColor="#9ca3af"
          {...props}
        />
      </View>
    );
  },
);
Input.displayName = "Input";
