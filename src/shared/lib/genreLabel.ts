// Nomes de gênero são majoritariamente estrangeirismos já correntes em
// pt-BR/es-ES (rock, jazz, funk...) — só os que ficam estranhos sem tratamento
// ganham label explícita aqui. O resto é capitalizado a partir do valor, o que
// deixa intacto o vocabulário da Apple no Top Charts ("Hip-Hop/Rap"), que já
// chega pronto.
const GENRE_LABELS: Record<string, string> = {
  "hip-hop": "Hip-hop",
  "r-b": "R&B",
  "k-pop": "K-pop",
  mpb: "MPB",
};

export function genreLabel(genre: string): string {
  return GENRE_LABELS[genre] ?? genre.charAt(0).toUpperCase() + genre.slice(1);
}
