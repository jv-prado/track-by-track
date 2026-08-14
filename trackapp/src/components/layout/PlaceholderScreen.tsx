import { Text, View } from "react-native";

/**
 * Placeholder temporário pras telas de tab ainda não construídas (Fase 4/5 do
 * trackapp/plan.md). Prova que a navegação da tab bar funciona antes do
 * conteúdo real existir — substituir tela por tela nas próximas fases.
 */
export function PlaceholderScreen({ title, phase }: { title: string; phase: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-2 bg-grafite p-6">
      <Text className="text-dourado" style={{ fontFamily: "SFProDisplay-Bold", fontSize: 20 }}>
        {title}
      </Text>
      <Text className="text-gray-400" style={{ fontFamily: "SFProDisplay-Regular", fontSize: 14 }}>
        Conteúdo real vem na {phase} (ver trackapp/plan.md)
      </Text>
    </View>
  );
}
