const cache = new Map<string, number[]>();
const inflight = new Map<string, Promise<number[]>>();

/**
 * Decodifica os picos de amplitude de uma prévia de 30s pra desenhar como barras
 * (a Spotify não expõe waveform pronta). Cacheia por URL — cada faixa só baixa e
 * decodifica uma vez por sessão, mesmo se o player for aberto/fechado várias vezes.
 */
export function getWaveformPeaks(url: string, bars = 28): Promise<number[]> {
  const cached = cache.get(url);
  if (cached) return Promise.resolve(cached);

  const existing = inflight.get(url);
  if (existing) return existing;

  const promise = decode(url, bars).finally(() => inflight.delete(url));
  inflight.set(url, promise);
  return promise;
}

async function decode(url: string, bars: number): Promise<number[]> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const audioContext = new AudioContext();
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.max(1, Math.floor(channelData.length / bars));
    const peaks: number[] = [];
    for (let i = 0; i < bars; i++) {
      const start = i * blockSize;
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[start + j] ?? 0);
      }
      peaks.push(sum / blockSize);
    }
    const max = Math.max(...peaks, 0.0001);
    const normalized = peaks.map((peak) => Math.max(0.08, peak / max));
    cache.set(url, normalized);
    return normalized;
  } finally {
    void audioContext.close();
  }
}
