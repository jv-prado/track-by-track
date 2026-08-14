import { useEffect, useState } from "react";

// Porta 1:1 de src/shared/lib/use-rotating-loading-text.ts (web) — setInterval
// funciona igual em RN.
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
