/**
 * Curada à mão porque o endpoint oficial de gêneros do Spotify
 * (`/recommendations/available-genre-seeds`) foi descontinuado em nov/2024
 * junto com `/recommendations` — não existe mais fonte dinâmica confiável.
 * Também é o vocabulário aceito pelo filtro `genre:"..."` da Search API.
 */
export const CURATED_GENRES = [
  'rock',
  'pop',
  'hip-hop',
  'r-b',
  'jazz',
  'electronic',
  'metal',
  'indie',
  'classical',
  'country',
  'reggae',
  'funk',
  'soul',
  'punk',
  'blues',
  'folk',
  'k-pop',
  'mpb',
  'samba',
  'sertanejo',
  'pagode',
] as const;

export type CuratedGenre = (typeof CURATED_GENRES)[number];
