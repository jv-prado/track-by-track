/**
 * Resolução de item de chart externo pro catálogo (spec §6): nunca aceitar o
 * primeiro resultado de busca cegamente. `score = nome*0.6 + artista*0.4`,
 * peso maior no título — mesmo critério do índice de texto do catálogo (ver
 * `album.schema.ts`, `weights: { name: 3, artist: 1 }`).
 *
 * Dice coefficient sobre bigramas: barato, sem dependência nova, tolera
 * diferença pequena de grafia ("Deluxe Edition", acento) sem confundir dois
 * artistas de nome parecido mas distinto.
 */
export const MATCH_THRESHOLD = 0.72;

export interface ChartMatchCandidate {
  name: string;
  artist: string;
}

// Marcas combinantes (acentos) que sobram depois do NFD — `\p{Diacritic}`
// evita deixar caractere combinante invisível solto no arquivo-fonte (um
// range Unicode literal corrompe fácil em copy/paste ou merge).
const DIACRITIC_MARKS = /\p{Diacritic}/gu;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITIC_MARKS, '') // remove acentos (marcas combinantes pós-NFD)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function bigrams(value: string): string[] {
  const flat = normalize(value).replace(/\s+/g, '');
  if (flat.length < 2) return flat ? [flat] : [];

  const grams: string[] = [];
  for (let i = 0; i < flat.length - 1; i += 1) {
    grams.push(flat.slice(i, i + 2));
  }
  return grams;
}

export function stringSimilarity(a: string, b: string): number {
  const gramsA = bigrams(a);
  const gramsB = bigrams(b);
  if (gramsA.length === 0 || gramsB.length === 0) {
    return normalize(a) === normalize(b) ? 1 : 0;
  }

  const remaining = new Map<string, number>();
  for (const gram of gramsA)
    remaining.set(gram, (remaining.get(gram) ?? 0) + 1);

  let overlap = 0;
  for (const gram of gramsB) {
    const count = remaining.get(gram) ?? 0;
    if (count > 0) {
      overlap += 1;
      remaining.set(gram, count - 1);
    }
  }

  return (2 * overlap) / (gramsA.length + gramsB.length);
}

export function matchScore(
  source: ChartMatchCandidate,
  candidate: ChartMatchCandidate,
): number {
  return (
    stringSimilarity(source.name, candidate.name) * 0.6 +
    stringSimilarity(source.artist, candidate.artist) * 0.4
  );
}

export function isConfidentMatch(
  source: ChartMatchCandidate,
  candidate: ChartMatchCandidate,
): boolean {
  return matchScore(source, candidate) >= MATCH_THRESHOLD;
}
