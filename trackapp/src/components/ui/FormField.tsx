import { type ReactNode } from "react";
import { Text, View } from "react-native";

// Porta 1:1 de src/shared/ui/FormField.tsx (web).
export interface FormFieldProps {
  label: string;
  error?: string;
  children: ReactNode;
}

export function FormField({ label, error, children }: FormFieldProps) {
  return (
    <View className="mb-4">
      <Text className="text-gray-300 mb-2 text-sm">{label}</Text>
      {children}
      {error && <Text className="mt-1 text-xs text-red-400">{error}</Text>}
    </View>
  );
}
