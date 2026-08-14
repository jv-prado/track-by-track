import { Pressable, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { colors } from "@/lib/colors";
import { cn } from "@/lib/cn";

/**
 * Extraído do padrão repetido em 5 telas do web (FeedPage, DiscoverPage,
 * TopAlbumsPage, MyRankingsPage, PublicProfilePage) — cada uma reimplementa o
 * mesmo bottom sheet de opção única (gênero ou ordenação) com JSX idêntico.
 * Não é invenção de UI nova (mesmo resultado visual/comportamental, mesma
 * lista com check na opção ativa) — só evita repetir o bloco 5 vezes aqui.
 */
export interface FilterOption<T extends string | undefined> {
  value: T;
  label: string;
}

export function FilterBottomSheet<T extends string | undefined>({
  open,
  onOpenChange,
  title,
  options,
  value,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={title}>
      <View className="gap-1">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.value ?? "__all__"}
              onPress={() => {
                onChange(option.value);
                onOpenChange(false);
              }}
              className={cn(
                "flex-row items-center justify-between rounded-lg px-3 py-2.5",
                active && "bg-dourado/10",
              )}
            >
              <Text className={cn("text-base", active ? "text-dourado" : "text-gray-200")}>
                {option.label}
              </Text>
              {active && <Check size={16} color={colors.dourado} />}
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}
