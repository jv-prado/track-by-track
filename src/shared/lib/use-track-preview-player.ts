import { useEffect, useRef, useState } from "react";

const DEFAULT_VOLUME = 1;

/**
 * Toca prévias de 30s da Spotify, uma faixa por vez (nova troca pausa a anterior).
 * Expõe currentTime/duration pra quem quiser desenhar barra de progresso/waveform.
 * `toggle` resolve `false` quando a prévia não pôde ser tocada — quem chama decide
 * o feedback (toast), o hook não conhece UI.
 */
export function useTrackPreviewPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  // Volume em ref também porque `toggle` precisa do valor atual sem virar dependência.
  const volumeRef = useRef(DEFAULT_VOLUME);
  const lastAudibleVolumeRef = useRef(DEFAULT_VOLUME);
  // Descarta o resultado de um play() antigo quando o usuário já clicou em outra faixa.
  const playRequestRef = useRef(0);

  useEffect(() => {
    const audio = new Audio();
    audio.volume = volumeRef.current;
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

  const toggle = async (trackId: string, previewUrl: string): Promise<boolean> => {
    const audio = audioRef.current;
    if (!audio) return false;

    if (playingTrackId === trackId) {
      playRequestRef.current += 1;
      audio.pause();
      setPlayingTrackId(null);
      return true;
    }

    if (!previewUrl) return false;

    const requestId = ++playRequestRef.current;
    audio.src = previewUrl;
    audio.volume = volumeRef.current;
    setCurrentTime(0);
    setDuration(0);
    setPlayingTrackId(trackId);

    try {
      await audio.play();
      return true;
    } catch {
      // Clique em outra faixa aborta o play anterior — não é erro pro usuário.
      if (playRequestRef.current !== requestId) return true;
      setPlayingTrackId(null);
      return false;
    }
  };

  const seek = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const setVolume = (next: number) => {
    const clamped = Math.max(0, Math.min(1, next));
    volumeRef.current = clamped;
    if (clamped > 0) lastAudibleVolumeRef.current = clamped;
    setVolumeState(clamped);
    if (audioRef.current) audioRef.current.volume = clamped;
  };

  const toggleMute = () => {
    setVolume(volumeRef.current === 0 ? lastAudibleVolumeRef.current || DEFAULT_VOLUME : 0);
  };

  return { playingTrackId, currentTime, duration, volume, toggle, seek, setVolume, toggleMute };
}
