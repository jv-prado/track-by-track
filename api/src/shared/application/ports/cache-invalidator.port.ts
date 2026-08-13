export const CACHE_INVALIDATOR = Symbol('CacheInvalidator');

/**
 * Port de invalidação. Vive em `application` porque é a camada que declara o que
 * precisa; `shared/infrastructure/cache` implementa. Um método por intenção de
 * negócio, não um `invalidate(key)` genérico: o use case sabe que publicou um
 * ranking, não que existe um Redis com chave `feed:v41:p1:30`.
 */
export interface CacheInvalidator {
  /** Ranking entrou, saiu ou mudou dentro do conjunto público (completo). */
  publicRankingsChanged(albumId: string, userId: string): Promise<void>;
  /** Mudança que não aparece em listagem pública (ranking ainda incompleto). */
  rankingChanged(albumId: string, userId: string): Promise<void>;
  /** displayName/avatar aparecem embutidos no feed e nas reviews de álbum. */
  userProfileChanged(userId: string): Promise<void>;
}
