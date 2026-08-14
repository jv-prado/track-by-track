import { useEffect, useRef, useState } from "react";

/**
 * Toca prévias de 30s da Spotify, uma faixa por vez (nova troca pausa a anterior).
 * Expõe currentTime/duration pra quem quiser desenhar barra de progresso/waveform.
 */
export function useTrackPreviewPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    const handleEnded = () => {
      setPlayingTrackId(null);
      setCurrentTime(0);
    };
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    return () => {
      audio.pause();
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audioRef.current = null;
    };
  }, []);

  const toggle = (trackId: string, previewUrl: string) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playingTrackId === trackId) {
      audio.pause();
      setPlayingTrackId(null);
      return;
    }

    audio.src = previewUrl;
    setCurrentTime(0);
    setDuration(0);
    void audio.play();
    setPlayingTrackId(trackId);
  };

  const seek = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  };

  return { playingTrackId, currentTime, duration, toggle, seek };
}
