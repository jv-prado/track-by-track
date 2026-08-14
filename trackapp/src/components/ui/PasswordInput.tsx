import { forwardRef, useState, type ElementRef } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Eye, EyeOff, Lock } from "lucide-react-native";
import { cn } from "@/lib/cn";
import { colors } from "@/lib/colors";
import { Input, type InputProps } from "./Input";

// Porta 1:1 de src/shared/ui/PasswordInput.tsx (web) — mesmo ícone de cadeado,
// mesmo botão de olho pra mostrar/ocultar (secureTextEntry no lugar de type).
export interface PasswordInputProps extends Omit<InputProps, "icon" | "secureTextEntry"> {
  containerClassName?: string;
}

export const PasswordInput = forwardRef<ElementRef<typeof TextInput>, PasswordInputProps>(
  ({ className, containerClassName, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <View className={cn("relative", containerClassName)}>
        <Input
          ref={ref}
          icon={<Lock size={16} color={colors.cinzaMedio} />}
          secureTextEntry={!visible}
          className={cn("pr-10", className)}
          {...props}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          accessibilityLabel={visible ? "Ocultar senha" : "Mostrar senha"}
          className="absolute right-3 top-0 bottom-0 justify-center"
        >
          {visible ? (
            <EyeOff size={16} color={colors.cinzaMedio} />
          ) : (
            <Eye size={16} color={colors.cinzaMedio} />
          )}
        </Pressable>
      </View>
    );
  },
);
PasswordInput.displayName = "PasswordInput";
