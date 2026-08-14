import { useEffect, useRef, useState } from "react";
import { Audio, type AVPlaybackStatus } from "expo-av";

const DEFAULT_VOLUME = 1;

/**
 * Porta de src/shared/lib/use-track-preview-player.ts (web, `<audio>` DOM) —
 * `expo-av` no lugar do elemento `<audio>`, mesma API exposta (toggle/seek/
 * setVolume/toggleMute/currentTime/duration/volume), mesmo comportamento (uma
 * faixa por vez, `toggle` resolvendo `false` quando não conseguiu tocar).
 */
export function useTrackPreviewPlayer() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const volumeRef = useRef(DEFAULT_VOLUME);
  const lastAudibleVolumeRef = useRef(DEFAULT_VOLUME);

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

  const toggle = async (trackId: string, previewUrl: string): Promise<boolean> => {
    if (playingTrackId === trackId) {
      await soundRef.current?.pauseAsync();
      setPlayingTrackId(null);
      return true;
    }

    if (!previewUrl) return false;

    try {
      await soundRef.current?.unloadAsync();
      setCurrentTime(0);
      setDuration(0);
      const { sound } = await Audio.Sound.createAsync(
        { uri: previewUrl },
        { shouldPlay: true, volume: volumeRef.current },
        handleStatus,
      );
      soundRef.current = sound;
      setPlayingTrackId(trackId);
      return true;
    } catch {
      setPlayingTrackId(null);
      return false;
    }
  };

  const seek = async (time: number) => {
    await soundRef.current?.setPositionAsync(time * 1000);
    setCurrentTime(time);
  };

  const setVolume = (next: number) => {
    const clamped = Math.max(0, Math.min(1, next));
    volumeRef.current = clamped;
    if (clamped > 0) lastAudibleVolumeRef.current = clamped;
    setVolumeState(clamped);
    void soundRef.current?.setVolumeAsync(clamped);
  };

  const toggleMute = () => {
    setVolume(volumeRef.current === 0 ? lastAudibleVolumeRef.current || DEFAULT_VOLUME : 0);
  };

  return { playingTrackId, currentTime, duration, volume, toggle, seek, setVolume, toggleMute };
}
