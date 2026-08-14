import { useState, type ReactNode } from "react";
import { Modal as RNModal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, ChevronDown } from "lucide-react-native";
import { cn } from "@/lib/cn";
import { colors } from "@/lib/colors";

/**
 * Porta de src/shared/ui/Select.tsx (web). Web tem 2 variantes (dropdown
 * flutuante ancorado no trigger pra sm+, bottom sheet abaixo disso) — RN só
 * roda em telefone, então aqui é sempre a variante bottom sheet (a mesma que
 * o web já usa abaixo de 640px). `mobileIconOnly` não tem breakpoint pra
 * alternar em RN — tratado igual a `iconOnly` (documentado, não é bug).
 */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export type SelectSize = "sm" | "md" | "lg";

const triggerSizeClasses: Record<SelectSize, string> = {
  sm: "h-9 px-3",
  md: "h-10 px-3",
  lg: "h-11 px-4",
};

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
  placeholder?: string;
  size?: SelectSize;
  icon?: ReactNode;
  mobileIconOnly?: boolean;
  iconOnly?: boolean;
}

export function Select({
  value,
  onChange,
  options,
  className,
  placeholder,
  size = "md",
  icon,
  mobileIconOnly = false,
  iconOnly = false,
}: SelectProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const showIconOnly = iconOnly || mobileIconOnly;
  const selected = options.find((option) => option.value === value);

  return (
    <View className={className}>
      <Pressable
        onPress={() => setOpen(true)}
        className={cn(
          "flex-row items-center justify-center gap-2 rounded-lg border border-white/10 bg-cinza-medio/40",
          showIconOnly ? "h-10 w-10 shrink-0" : "w-full justify-between",
          triggerSizeClasses[size],
        )}
      >
        {icon && <View className="shrink-0">{icon}</View>}
        {!showIconOnly && (
          <Text className={cn("flex-1 text-left text-sm", selected ? "text-white" : "text-gray-500")}>
            {selected?.label ?? placeholder}
          </Text>
        )}
        {!showIconOnly && <ChevronDown size={16} color={colors.cinzaMedio} />}
      </Pressable>

      <RNModal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/60" onPress={() => setOpen(false)}>
          <Pressable
            className="max-h-[70%] rounded-t-2xl border-t border-white/10 bg-cinza-escuro"
            style={{ paddingBottom: insets.bottom }}
          >
            <View className="flex-row items-center justify-between border-b border-white/10 px-4 py-3">
              <Text className="text-base font-semibold text-white">{placeholder}</Text>
              <Pressable onPress={() => setOpen(false)} accessibilityLabel="Fechar">
                <Text className="text-sm text-gray-400">Fechar</Text>
              </Pressable>
            </View>
            <ScrollView>
              {options.map((option) => (
                <Pressable
                  key={option.value}
                  disabled={option.disabled}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className="flex-row items-center gap-2 px-4 py-3"
                >
                  <Text
                    className={cn(
                      "flex-1 text-base",
                      option.disabled
                        ? "text-gray-600"
                        : option.value === value
                          ? "text-dourado"
                          : "text-gray-200",
                    )}
                  >
                    {option.label}
                  </Text>
                  {option.value === value && <Check size={16} color={colors.dourado} />}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </RNModal>
    </View>
  );
}
