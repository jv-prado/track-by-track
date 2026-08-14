import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getWaveformPeaks } from "@/shared/lib/decode-waveform";
import { Spinner } from "@/shared/ui/Spinner";
import { cn } from "@/shared/lib/cn";

const FALLBACK_BAR_COUNT = 28;
const FALLBACK_PEAKS = Array<number>(FALLBACK_BAR_COUNT).fill(0.2);

function formatElapsed(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function TrackPreviewPlayer({
  previewUrl,
  isLoading,
  isPlaying,
  currentTime,
  duration,
  onToggle,
  onSeek,
}: {
  /** `undefined` = ainda não sabemos (busca sob demanda); `null` = confirmado sem prévia. */
  previewUrl?: string | null;
  isLoading?: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onToggle: () => void;
  onSeek: (time: number) => void;
}) {
  const { t } = useTranslation();
  const [peaks, setPeaks] = useState<number[] | null>(null);

  useEffect(() => {
    if (!isPlaying || !previewUrl || peaks) return;
    let cancelled = false;
    void getWaveformPeaks(previewUrl).then((result) => {
      if (!cancelled) setPeaks(result);
    });
    return () => {
      cancelled = true;
    };
  }, [isPlaying, previewUrl, peaks]);

  // Confirmado (já buscamos e não achamos) — nem mostra o botão. `undefined` ainda
  // é "não sabemos", então continua clicável pra disparar a busca.
  if (previewUrl === null) {
    return <span className="w-7 shrink-0" aria-hidden />;
  }

  const bars = peaks ?? FALLBACK_PEAKS;
  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        type="button"
        onClick={onToggle}
        disabled={isLoading}
        aria-label={isPlaying ? t("albumDetail.pausePreview") : t("albumDetail.playPreview")}
        className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-white/5 text-dourado hover:bg-white/10 transition cursor-pointer disabled:cursor-wait"
      >
        {isLoading ? (
          <Spinner className="h-3.5 w-3.5" />
        ) : isPlaying ? (
          <Pause size={14} />
        ) : (
          <Play size={14} />
        )}
      </button>

      {isPlaying && (
        <>
          <button
            type="button"
            onClick={(event) => {
              if (duration <= 0) return;
              const rect = event.currentTarget.getBoundingClientRect();
              const ratio = (event.clientX - rect.left) / rect.width;
              onSeek(Math.max(0, Math.min(duration, ratio * duration)));
            }}
            aria-label={t("albumDetail.seekPreview")}
            className="flex items-end gap-[2px] h-7 w-24 cursor-pointer"
          >
            {bars.map((peak, index) => {
              const played = index / bars.length <= progress;
              return (
                <span
                  key={index}
                  className={cn(
                    "w-[2px] rounded-full transition-colors",
                    played ? "bg-dourado" : "bg-white/15",
                  )}
                  style={{ height: `${Math.max(15, peak * 100)}%` }}
                />
              );
            })}
          </button>
          <span className="text-gray-500 text-xs tabular-nums shrink-0">
            {formatElapsed(currentTime)} / {formatElapsed(duration || 30)}
          </span>
        </>
      )}
    </div>
  );
}
