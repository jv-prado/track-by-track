import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react-native";
import BrazilFlag from "@/assets/images/flags/brazil.svg";
import UsaFlag from "@/assets/images/flags/usa.svg";
import SpainFlag from "@/assets/images/flags/spain.svg";
import { colors } from "@/lib/colors";
import { cn } from "@/lib/cn";

const LANGUAGES = [
  { code: "pt-BR", short: "pt", label: "Português", Flag: BrazilFlag },
  { code: "en-US", short: "en", label: "English", Flag: UsaFlag },
  { code: "es-ES", short: "es", label: "Español", Flag: SpainFlag },
] as const;

/**
 * Porta de src/componentes/LanguageSelector/index.tsx (web). Web é um
 * dropdown-dentro-de-dropdown (botão com bandeira atual → abre lista); aqui
 * o continente já é o `BottomSheet` de perfil (AppTabBar) — popup dentro de
 * popup é ruim ao toque, então a lista de idiomas aparece direto, sem
 * segundo nível. Mesmas 3 opções, mesmo check na ativa, mesma ação.
 */
export function LanguageSelector() {
  const { i18n } = useTranslation();
  const current = LANGUAGES.find((lang) => i18n.language?.startsWith(lang.short)) ?? LANGUAGES[0];

  return (
    <View className="gap-1">
      {LANGUAGES.map(({ code, label, Flag }) => {
        const active = code === current.code;
        return (
          <Pressable
            key={code}
            onPress={() => i18n.changeLanguage(code)}
            className="flex-row items-center gap-2 rounded-lg px-3 py-2.5"
          >
            <Flag width={20} height={14} />
            <Text className={cn("flex-1 text-base", active ? "text-dourado" : "text-gray-300")}>
              {label}
            </Text>
            {active && <Check size={14} color={colors.dourado} />}
          </Pressable>
        );
      })}
    </View>
  );
}
