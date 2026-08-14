import { type ReactNode } from "react";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}

export function FormField({ label, htmlFor, error, children }: FormFieldProps) {
  return (
    <div className="mb-3 sm:mb-4">
      <label htmlFor={htmlFor} className="block text-gray-300 mb-1.5 sm:mb-2 text-sm sm:text-base">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs sm:text-sm text-red-400">{error}</p>}
    </div>
  );
}
