import { useEffect } from "react";
import { Loader2 } from "lucide-react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors } from "@/lib/colors";

/**
 * Porta de src/shared/ui/Spinner.tsx (web, `animate-spin` do Tailwind). RN não
 * tem CSS animation — mesma rotação contínua via Reanimated em vez de
 * className, resultado visual idêntico.
 */
export interface SpinnerProps {
  size?: number;
  color?: string;
}

export function Spinner({ size = 16, color = colors.dourado }: SpinnerProps) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1000, easing: Easing.linear }),
      -1,
    );
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Loader2 size={size} color={color} />
    </Animated.View>
  );
}
