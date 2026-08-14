import { useEffect, useRef, useState } from "react";
import { Audio, type AVPlaybackStatus } from "expo-av";

/**
 * Porta de src/shared/lib/use-track-preview-player.ts (web, `<audio>` DOM) —
 * `expo-av` no lugar do elemento `<audio>`, mesma API exposta (toggle/seek/
 * currentTime/duration), mesmo comportamento (uma faixa por vez).
 */
export function useTrackPreviewPlayer() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const handleStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setCurrentTime(status.positionMillis / 1000);
    setDuration((status.durationMillis ?? 0) / 1000);
    if (status.didJustFinish) {
      setPlayingTrackId(null);
      setCurrentTime(0);
    }
  };

  const toggle = async (trackId: string, previewUrl: string) => {
    if (playingTrackId === trackId) {
      await soundRef.current?.pauseAsync();
      setPlayingTrackId(null);
      return;
    }

    await soundRef.current?.unloadAsync();
    setCurrentTime(0);
    setDuration(0);
    const { sound } = await Audio.Sound.createAsync({ uri: previewUrl }, { shouldPlay: true }, handleStatus);
    soundRef.current = sound;
    setPlayingTrackId(trackId);
  };

  const seek = async (time: number) => {
    await soundRef.current?.setPositionAsync(time * 1000);
    setCurrentTime(time);
  };

  return { playingTrackId, currentTime, duration, toggle, seek };
}
