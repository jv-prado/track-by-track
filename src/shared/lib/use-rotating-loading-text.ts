import { useEffect, useState } from "react";

/**
 * Troca a chave de tradução exibida a cada `intervalMs` — pra loading longo (chamada a API
 * externa sem cache garantido, ex: Spotify/Apple) não parecer travado. Ver DiscoverPage/
 * AlbumRatingView: os dois pontos do app com latência imprevisível usam este hook.
 */
export function useRotatingLoadingText(keys: readonly string[], intervalMs = 5000) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % keys.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [keys.length, intervalMs]);

  return keys[index] ?? keys[0] ?? "";
}
