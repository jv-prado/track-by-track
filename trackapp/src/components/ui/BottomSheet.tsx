import { useEffect, useState, type ReactNode } from "react";
import { Modal as RNModal, Pressable, ScrollView, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { cn } from "@/lib/cn";
import { colors } from "@/lib/colors";

/**
 * Porta de src/shared/ui/BottomSheet.tsx (web, Radix Dialog + arrasto por
 * pointer events). RN só roda em telefone — aqui é sempre a variante mobile
 * (bottom sheet), sem o drawer lateral de desktop que o web tem no sm+.
 * Arrasto pra fechar via Gesture.Pan (react-native-gesture-handler), mesmos
 * limiares do web: 120px de distância OU 0.5px/ms de velocidade.
 */
const CLOSE_DISTANCE_PX = 120;
const CLOSE_VELOCITY_PX_S = 500; // 0.5px/ms == 500px/s (unidade do gesture-handler)
const EASE_OVERLAY_IN = Easing.bezier(0, 0, 0.58, 1);
const EASE_OVERLAY_OUT = Easing.bezier(0.42, 0, 1, 1);
const EASE_SHEET_IN = Easing.bezier(0.16, 1, 0.3, 1);
const EASE_SHEET_OUT = Easing.bezier(0.4, 0, 1, 1);
const OFFSCREEN_Y = 800;

export interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** Ações extras no header, entre o título e o botão de fechar (ex: compartilhar). */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function BottomSheet({ open, onOpenChange, title, actions, children, className }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(open);
  const overlayOpacity = useSharedValue(0);
  const translateY = useSharedValue(OFFSCREEN_Y);

  useEffect(() => {
    if (open) {
      setMounted(true);
      overlayOpacity.value = withTiming(1, { duration: 200, easing: EASE_OVERLAY_IN });
      translateY.value = withTiming(0, { duration: 220, easing: EASE_SHEET_IN });
    } else {
      overlayOpacity.value = withTiming(0, { duration: 150, easing: EASE_OVERLAY_OUT });
      translateY.value = withTiming(OFFSCREEN_Y, { duration: 180, easing: EASE_SHEET_OUT }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => onOpenChange(false);

  const dragGesture = Gesture.Pan()
    .onChange((e) => {
      translateY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      const shouldClose = translateY.value > CLOSE_DISTANCE_PX || e.velocityY > CLOSE_VELOCITY_PX_S;
      if (shouldClose) {
        // não anima aqui — muda `open` no pai e deixa o useEffect acima (que já
        // sabe animar overlay+sheet de saída e desmontar) cuidar do resto.
        runOnJS(close)();
      } else {
        translateY.value = withTiming(0, { duration: 200, easing: EASE_SHEET_OUT });
      }
    });

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  if (!mounted) return null;

  return (
    <RNModal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={close}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <Pressable className="absolute inset-0" onPress={close}>
        <Animated.View className="absolute inset-0 bg-black/60" style={overlayStyle} />
      </Pressable>

      <Animated.View
        className={cn(
          "absolute inset-x-0 bottom-0 flex max-h-[85%] flex-col overflow-hidden rounded-t-2xl border-t border-white/10 bg-grafite",
          className,
        )}
        style={sheetStyle}
      >
        <GestureDetector gesture={dragGesture}>
          <View className="shrink-0">
            <View className="mx-auto mt-3 h-1 w-9 rounded-full bg-white/15" />
            <View className="flex-row items-center justify-between gap-2 px-5 pb-3 pt-4">
              <Text className="text-base font-semibold text-white">{title}</Text>
              <View className="flex-row shrink-0 items-center gap-1">
                {actions}
                <Pressable onPress={close} className="rounded-full p-1.5">
                  <X size={18} color={colors.cinzaMedio} />
                </Pressable>
              </View>
            </View>
            <View className="border-b border-white/5" />
          </View>
        </GestureDetector>

        <ScrollView
          className="min-h-0 flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 20 }}
        >
          {children}
        </ScrollView>
      </Animated.View>
    </RNModal>
  );
}
