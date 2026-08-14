import { Pressable, View } from "react-native";
import { Star } from "lucide-react-native";
import { colors } from "@/lib/colors";

export interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  size?: number;
}

const STARS = [1, 2, 3, 4, 5];

/**
 * Porta de src/shared/album/StarRating.tsx (web). Nota do VO `Score`: passos
 * de meia estrela, 0 a 5. Clicar na nota atual zera — mesma regra.
 *
 * Web tem preview por hover do mouse, mas já desliga isso pra touch
 * (`if (event.pointerType === "touch") return`) — ou seja, no toque o web já
 * se comporta exatamente como esta versão: 2 alvos de toque por estrela
 * (metade esquerda/direita), sem preview, só o tap definindo a nota. Não é
 * simplificação, é a mesma lógica de touch que o próprio web usa.
 */
export function StarRating({ value, onChange, disabled, size = 20 }: StarRatingProps) {
  const commit = (next: number) => {
    onChange(next === value ? 0 : next);
  };

  return (
    <View className={disabled ? "flex-row items-center opacity-50" : "flex-row items-center"}>
      {STARS.map((star) => {
        const fillFraction = Math.min(1, Math.max(0, value - (star - 1)));
        const boxSize = size + (disabled ? 0 : 8); // p-1 (4px) de cada lado no web

        return (
          <View key={star} style={{ width: boxSize, height: boxSize }} className="relative">
            <View
              className="absolute items-center justify-center"
              style={{ top: 0, left: 0, width: boxSize, height: boxSize }}
              pointerEvents="none"
            >
              <View style={{ width: size, height: size }}>
                <Star size={size} color="#4b5563" />
                <View
                  className="absolute overflow-hidden"
                  style={{ top: 0, left: 0, width: `${fillFraction * 100}%`, height: size }}
                >
                  <Star size={size} color={colors.dourado} fill={colors.dourado} />
                </View>
              </View>
            </View>

            {!disabled && (
              <View className="absolute inset-0 flex-row">
                {[star - 0.5, star].map((half) => (
                  <Pressable
                    key={half}
                    onPress={() => commit(half)}
                    accessibilityLabel={`Nota ${half}`}
                    style={{ width: "50%", height: "100%" }}
                  />
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
