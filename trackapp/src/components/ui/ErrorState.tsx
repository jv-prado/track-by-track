import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AlertCircle } from "lucide-react-native";
import { Button } from "./Button";

// Porta 1:1 de src/shared/ui/ErrorState.tsx (web).
export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { t } = useTranslation();

  return (
    <View className="items-center justify-center gap-3 py-12">
      <AlertCircle size={40} color="#f87171" />
      <Text className="text-center text-gray-300">{message}</Text>
      {onRetry && (
        <Button variant="secondary" size="sm" onPress={onRetry}>
          {t("common.retry")}
        </Button>
      )}
    </View>
  );
}
