import { useEffect, useState, type ReactNode } from "react";
import { Modal as RNModal, Pressable, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { cn } from "@/lib/cn";
import { colors } from "@/lib/colors";

/**
 * Porta de src/shared/ui/Modal.tsx (web, Radix Dialog). Web tem 2 variantes
 * por breakpoint (bottom sheet no mobile, modal centralizado no sm+) — RN só
 * roda em telefone, então aqui é sempre a variante bottom sheet (a mesma que
 * o web já usa abaixo de 640px), sem a ramificação de desktop.
 *
 * Mesmos tempos/curvas do web (index.css): overlay 200ms ease-out /
 * 150ms ease-in; sheet 220ms cubic-bezier(0.16,1,0.3,1) /
 * 180ms cubic-bezier(0.4,0,1,1).
 */
const EASE_OVERLAY_IN = Easing.bezier(0, 0, 0.58, 1);
const EASE_OVERLAY_OUT = Easing.bezier(0.42, 0, 1, 1);
const EASE_SHEET_IN = Easing.bezier(0.16, 1, 0.3, 1);
const EASE_SHEET_OUT = Easing.bezier(0.4, 0, 1, 1);
const OFFSCREEN_Y = 600;

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Modal({ open, onOpenChange, title, description, children, footer, className }: ModalProps) {
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
        if (finished) setMounted(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  if (!mounted) return null;

  return (
    <RNModal visible={mounted} transparent animationType="none" onRequestClose={() => onOpenChange(false)}>
      <Pressable
        className="absolute inset-0 bg-black/60"
        onPress={() => onOpenChange(false)}
      >
        <Animated.View className="absolute inset-0 bg-black/60" style={overlayStyle} />
      </Pressable>

      <Animated.View
        className={cn(
          "absolute inset-x-0 bottom-0 gap-4 rounded-t-2xl border-t border-white/10 bg-grafite p-5",
          className,
        )}
        style={[sheetStyle, { paddingBottom: insets.bottom + 20 }]}
      >
        <View className="mx-auto h-1.5 w-10 rounded-full bg-white/15" />
        <View className="flex-row items-start justify-between gap-2">
          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-lg font-semibold text-white">{title}</Text>
            {description && <Text className="text-sm text-gray-400">{description}</Text>}
          </View>
          <Pressable onPress={() => onOpenChange(false)} className="shrink-0 rounded-lg p-1.5">
            <X size={18} color={colors.cinzaMedio} />
          </Pressable>
        </View>
        {children}
        {footer && <View className="flex-row justify-end gap-2">{footer}</View>}
      </Animated.View>
    </RNModal>
  );
}
