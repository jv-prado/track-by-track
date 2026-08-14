import { useEffect } from "react";
import { type ViewProps } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { cn } from "@/lib/cn";

// Porta de src/shared/ui/Skeleton.tsx (web, `animate-pulse` do Tailwind) — RN
// não tem CSS animation, mesmo efeito (opacidade pulsando) via Reanimated.
export function Skeleton({ className, ...props }: ViewProps & { className?: string }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      className={cn("rounded-lg bg-white/5", className)}
      style={animatedStyle}
      {...props}
    />
  );
}
