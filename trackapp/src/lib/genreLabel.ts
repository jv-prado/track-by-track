// Porta 1:1 de src/shared/lib/genreLabel.ts (web) — zero dependência de DOM,
// código puro.
const GENRE_LABELS: Record<string, string> = {
  "hip-hop": "Hip-hop",
  "r-b": "R&B",
  "k-pop": "K-pop",
  mpb: "MPB",
};

export function genreLabel(genre: string): string {
  return GENRE_LABELS[genre] ?? genre.charAt(0).toUpperCase() + genre.slice(1);
}
