import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Pause, Play } from "lucide-react-native";
import { Spinner } from "@/components/ui/Spinner";
import { colors } from "@/lib/colors";

const FALLBACK_BAR_COUNT = 28;
const FALLBACK_PEAKS = Array<number>(FALLBACK_BAR_COUNT).fill(0.2);

function formatElapsed(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export interface TrackPreviewPlayerProps {
  previewUrl?: string | null;
  isLoading?: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onToggle: () => void;
  onSeek: (time: number) => void;
}

/**
 * Porta de src/shared/album/TrackPreviewPlayer.tsx (web). Web decodifica a
 * waveform real via Web Audio API (`decode-waveform.ts`, `AudioContext` —
 * não existe em RN sem módulo nativo de DSP). **Não portado**: sempre usa a
 * mesma barra "achatada" que o próprio web já usa como fallback antes da
 * waveform real carregar — não é visual novo, é o fallback documentado do
 * web, só que permanente aqui.
 */
export function TrackPreviewPlayer({
  previewUrl,
  isLoading,
  isPlaying,
  currentTime,
  duration,
  onToggle,
  onSeek,
}: TrackPreviewPlayerProps) {
  const { t } = useTranslation();

  if (previewUrl === null) {
    return <View style={{ width: 28 }} />;
  }

  const bars = FALLBACK_PEAKS;
  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <View className="flex-row items-center gap-2">
      <Pressable
        onPress={onToggle}
        disabled={isLoading}
        accessibilityLabel={isPlaying ? t("albumDetail.pausePreview") : t("albumDetail.playPreview")}
        className="h-7 w-7 items-center justify-center rounded-full bg-white/5"
      >
        {isLoading ? (
          <Spinner size={14} />
        ) : isPlaying ? (
          <Pause size={14} color={colors.dourado} />
        ) : (
          <Play size={14} color={colors.dourado} />
        )}
      </Pressable>

      {isPlaying && (
        <>
          <Pressable
            onPress={(event) => {
              if (duration <= 0) return;
              const { locationX } = event.nativeEvent;
              const ratio = locationX / 96; // w-24 == 96px
              onSeek(Math.max(0, Math.min(duration, ratio * duration)));
            }}
            accessibilityLabel={t("albumDetail.seekPreview")}
            className="h-7 w-24 flex-row items-end gap-[2px]"
          >
            {bars.map((peak, index) => {
              const played = index / bars.length <= progress;
              return (
                <View
                  key={index}
                  className={played ? "w-[2px] rounded-full bg-dourado" : "w-[2px] rounded-full bg-white/15"}
                  style={{ height: `${Math.max(15, peak * 100)}%` }}
                />
              );
            })}
          </Pressable>
          <Text className="shrink-0 text-xs tabular-nums text-gray-500">
            {formatElapsed(currentTime)} / {formatElapsed(duration || 30)}
          </Text>
        </>
      )}
    </View>
  );
}
