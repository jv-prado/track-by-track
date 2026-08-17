import { mergeByRank } from './apple-top-albums.service';
import type { ChartAlbumRaw } from './apple-top-albums.service';

function album(name: string, genres: string[] = []): ChartAlbumRaw {
  return { artistName: 'Artist', name, genres };
}

describe('mergeByRank', () => {
  it('não depende da ordem das lojas no array — mesmo dado, ordens diferentes, mesmo resultado', () => {
    const brChart = [album('Album BR #1'), album('Album Comum')];
    const usChart = [album('Album Comum'), album('Album US #1')];

    const brFirst = mergeByRank([brChart, usChart]);
    const usFirst = mergeByRank([usChart, brChart]);

    expect(brFirst.map((a) => a.name)).toEqual(usFirst.map((a) => a.name));
  });

  it('presença ampla (rank 2 em todas as lojas) bate pico isolado (rank 1 numa loja só)', () => {
    // "Isolado" é #1 só na loja A, ausente nas outras 3 (penalidade 101 cada).
    // "Amplo" é #2 nas 4 lojas — média bem melhor apesar de nunca ser #1.
    const isolado = album('Isolado');
    const amplo = album('Amplo');
    const outro = album('Outro'); // ocupa a posição 1 nas lojas onde "Amplo" é 2º

    const chartA = [isolado, amplo]; // Isolado #1, Amplo #2
    const chartB = [outro, amplo]; // Amplo #2
    const chartC = [outro, amplo]; // Amplo #2
    const chartD = [outro, amplo]; // Amplo #2

    const result = mergeByRank([chartA, chartB, chartC, chartD]);

    expect(result[0]?.name).toBe('Amplo');
  });

  it('gêneros de lojas diferentes pro mesmo álbum são somados sem duplicar', () => {
    const chartA = [album('Same Album', ['Pop'])];
    const chartB = [album('Same Album', ['Latin'])];

    const result = mergeByRank([chartA, chartB]);

    expect(result).toHaveLength(1);
    expect(result[0]?.genres.sort()).toEqual(['Latin', 'Pop']);
  });
});
