import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, rows = 3, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        "w-full bg-cinza-medio/40 border border-white/10 p-2.5 rounded-lg text-white placeholder:text-gray-400 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-dourado focus:border-dourado/60 resize-y",
        className,
      )}
      {...props}
    />
  ),
);
TextArea.displayName = "TextArea";
