import { forwardRef, type ElementRef } from "react";
import { TextInput, type TextInputProps } from "react-native";
import { cn } from "@/lib/cn";

// Porta 1:1 de src/shared/ui/TextArea.tsx (web) — `multiline`+`numberOfLines`
// no lugar do `<textarea rows>` nativo do browser.
export type TextAreaProps = TextInputProps & { rows?: number };

export const TextArea = forwardRef<ElementRef<typeof TextInput>, TextAreaProps>(
  ({ className, rows = 3, ...props }, ref) => (
    <TextInput
      ref={ref}
      multiline
      numberOfLines={rows}
      textAlignVertical="top"
      placeholderTextColor="#9ca3af"
      className={cn(
        "w-full rounded-lg border border-white/10 bg-cinza-medio/40 p-2.5 text-sm text-white",
        className,
      )}
      {...props}
    />
  ),
);
TextArea.displayName = "TextArea";
