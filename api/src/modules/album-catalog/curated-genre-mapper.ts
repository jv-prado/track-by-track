import type { CuratedGenre } from './genres.constant';

/**
 * O Spotify nunca devolve as 21 categorias curadas — devolve tags finas de
 * artista ("classic rock", "hard rock", "brazilian hip hop", "sertanejo
 * universitário"...). Igualdade exata contra `CURATED_GENRES` (como o filtro
 * de `DiscoveryService.topAlbums` fazia) só bate quando o Spotify por acaso
 * usa o termo largo sozinho — raro. Confirmado com dados reais do Mongo: de
 * ~30 tags distintas gravadas em `albums.genres`, só 4 eram match exato de
 * alguma categoria curada.
 *
 * Cada regra é `[categoria curada, palavras-chave]` — uma tag do Spotify cai
 * na categoria se contiver qualquer palavra-chave como substring (case
 * insensitive). Uma tag pode cair em mais de uma categoria (ex.: "trap funk"
 * → hip-hop e funk; "k-pop" → k-pop e pop) — não são buckets exclusivos.
 */
const CURATED_GENRE_RULES: [CuratedGenre, string[]][] = [
  ['k-pop', ['k-pop', 'kpop']],
  ['rock', ['rock', 'grunge', 'britpop', 'shoegaze', 'emo', 'alternative']],
  ['metal', ['metal', 'metalcore', 'deathcore', 'djent']],
  ['hip-hop', ['hip hop', 'hip-hop', 'rap', 'trap', 'drill', 'grime']],
  ['r-b', ['r&b', 'r & b', 'rnb', 'neo soul']],
  ['soul', ['soul', 'motown']],
  ['jazz', ['jazz', 'bebop', 'bossa nova', 'big band']],
  [
    'electronic',
    [
      'electronic',
      'edm',
      'house',
      'techno',
      'electro',
      'dubstep',
      'drum and bass',
      'trance',
      'synth',
      'ambient',
    ],
  ],
  ['indie', ['indie', 'lo-fi', 'bedroom pop']],
  ['classical', ['classical', 'orchestr', 'opera', 'baroque', 'symphon']],
  ['country', ['country', 'bluegrass', 'americana']],
  ['reggae', ['reggae', 'dancehall', 'ska']],
  ['funk', ['funk', 'disco']],
  ['punk', ['punk', 'hardcore']],
  ['blues', ['blues']],
  ['folk', ['folk', 'singer-songwriter']],
  ['mpb', ['mpb', 'musica popular brasileira', 'música popular brasileira']],
  ['samba', ['samba']],
  ['sertanejo', ['sertanejo', 'forró', 'forro', 'piseiro', 'arrocha']],
  ['pagode', ['pagode']],
  // 'pop' por último: substring genérico demais pra checar antes das outras
  // (senão "k-pop"/"synth pop" já parariam a busca cedo por engano — não faz
  // diferença aqui porque o filtro não é `find`, é `filter`, mas mantém a
  // leitura na mesma ordem que se pensa nas categorias: específica → geral).
  ['pop', ['pop']],
];

export function mapToCuratedGenres(rawGenres: string[]): CuratedGenre[] {
  const normalized = rawGenres.map((genre) => genre.toLowerCase());
  const matched = CURATED_GENRE_RULES.filter(([, keywords]) =>
    keywords.some((keyword) => normalized.some((tag) => tag.includes(keyword))),
  ).map(([genre]) => genre);
  return [...new Set(matched)];
}
