import { Text, View } from "react-native";
import { AlertCircle } from "lucide-react-native";
import { Button } from "./Button";

// Porta 1:1 de src/shared/ui/ErrorState.tsx (web). i18n do mobile ainda não
// existe (gap registrado no plan.md) — texto pt-BR direto, mesmo valor do
// fallback `common.retry` do web.
export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View className="items-center justify-center gap-3 py-12">
      <AlertCircle size={40} color="#f87171" />
      <Text className="text-center text-gray-300">{message}</Text>
      {onRetry && (
        <Button variant="secondary" size="sm" onPress={onRetry}>
          Tentar novamente
        </Button>
      )}
    </View>
  );
}
