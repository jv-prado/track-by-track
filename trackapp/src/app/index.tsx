import { ScrollView, Text, View } from "react-native";

/**
 * Fase 1 (trackapp/plan.md) — prova visual de que os tokens de cor/fonte batem
 * com o web (src/index.css) antes de qualquer tela de verdade ser construída.
 * Não é uma tela do produto — remover quando a Fase 3 (design system) começar.
 */
const COLOR_TOKENS = [
  { name: "roxo", className: "bg-roxo" },
  { name: "roxo-escuro", className: "bg-roxo-escuro" },
  { name: "roxo-vivo", className: "bg-roxo-vivo" },
  { name: "dourado", className: "bg-dourado" },
  { name: "dourado-claro", className: "bg-dourado-claro" },
  { name: "cinza-escuro", className: "bg-cinza-escuro" },
  { name: "cinza", className: "bg-cinza" },
  { name: "cinza-medio", className: "bg-cinza-medio" },
  { name: "cinza-claro", className: "bg-cinza-claro" },
  { name: "offwhite", className: "bg-offwhite" },
] as const;

export default function TokenProofScreen() {
  return (
    <ScrollView className="flex-1 bg-grafite" contentContainerClassName="gap-6 p-6 pt-16">
      <Text
        className="text-dourado text-center"
        style={{ fontFamily: "SFProDisplay-Bold", fontSize: 44, lineHeight: 53 }}
      >
        Track by Track
      </Text>
      <Text
        className="text-offwhite text-center"
        style={{ fontFamily: "SFProDisplay-Semibold", fontSize: 26, lineHeight: 39 }}
      >
        Fase 1 — prova de tokens
      </Text>

      <Text className="text-branco" style={{ fontFamily: "SFProDisplay-Regular", fontSize: 18, lineHeight: 27 }}>
        Este parágrafo usa a mesma fonte (SF Pro Display) e a mesma escala do web
        (--font-paragraph-large). Compare lado a lado com o site.
      </Text>

      <View className="gap-2">
        {COLOR_TOKENS.map(({ name, className }) => (
          <View key={name} className="flex-row items-center gap-3">
            <View className={`h-8 w-8 rounded ${className} border border-cinza`} />
            <Text className="text-offwhite" style={{ fontFamily: "SFProDisplay-Medium", fontSize: 13 }}>
              {name}
            </Text>
          </View>
        ))}
      </View>

      <Text className="text-cinza-claro" style={{ fontFamily: "SFProDisplay-Regular", fontSize: 12.5 }}>
        --font-label equivalente
      </Text>
    </ScrollView>
  );
}
