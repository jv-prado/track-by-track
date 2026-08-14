import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { Button } from "./Button";

// Porta 1:1 de src/shared/ui/Pagination.tsx (web).
export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const { t } = useTranslation();

  if (totalPages <= 1) return null;

  return (
    <View className="mt-6 flex-row items-center justify-center gap-3">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onPress={() => onPageChange(page - 1)}
        accessibilityLabel={t("pagination.previous")}
      >
        <ChevronLeft size={16} color="#ffffff" />
      </Button>

      <Text className="text-sm text-gray-400">{t("pagination.pageOf", { page, totalPages })}</Text>

      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onPress={() => onPageChange(page + 1)}
        accessibilityLabel={t("pagination.next")}
      >
        <ChevronRight size={16} color="#ffffff" />
      </Button>
    </View>
  );
}
