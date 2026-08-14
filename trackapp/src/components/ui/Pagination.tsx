import { Text, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { Button } from "./Button";

// Porta 1:1 de src/shared/ui/Pagination.tsx (web). i18n do mobile ainda não
// existe (gap registrado no plan.md) — strings pt-BR direto do pt-BR.json.
export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <View className="mt-6 flex-row items-center justify-center gap-3">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onPress={() => onPageChange(page - 1)}
        accessibilityLabel="Página anterior"
      >
        <ChevronLeft size={16} color="#ffffff" />
      </Button>

      <Text className="text-sm text-gray-400">
        Página {page} de {totalPages}
      </Text>

      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onPress={() => onPageChange(page + 1)}
        accessibilityLabel="Próxima página"
      >
        <ChevronRight size={16} color="#ffffff" />
      </Button>
    </View>
  );
}
