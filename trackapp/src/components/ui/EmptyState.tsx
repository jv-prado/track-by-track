import { type ReactNode } from "react";
import { Text, View } from "react-native";
import { Inbox } from "lucide-react-native";
import { colors } from "@/lib/colors";

// Porta 1:1 de src/shared/ui/EmptyState.tsx (web).
export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <View className="items-center justify-center gap-2 py-12">
      <Inbox size={40} color={colors.cinzaMedio} />
      <Text className="font-medium text-white">{title}</Text>
      {description && <Text className="text-sm text-gray-400">{description}</Text>}
      {action}
    </View>
  );
}
