import type { CacheInvalidator } from '../../../shared/application/ports/cache-invalidator.port';

interface RankingCacheSubject {
  albumId: string;
  userId: string;
  completedAt: Date | null;
}

/**
 * Decide, num só lugar, se a mutação mexeu no que é público.
 *
 * Feed e top-albums listam apenas ranking completo. Então: nota trocada em
 * ranking já completo muda a média exibida (invalidação global), nota em ranking
 * incompleto não aparece em lugar público (invalidação só do álbum e do usuário),
 * e cruzar a fronteira em qualquer direção conta como mudança pública.
 */
export function invalidateRankingCache(
  invalidator: CacheInvalidator,
  ranking: RankingCacheSubject,
  wasComplete: boolean,
): Promise<void> {
  const affectsPublicLists = wasComplete || ranking.completedAt !== null;
  return affectsPublicLists
    ? invalidator.publicRankingsChanged(ranking.albumId, ranking.userId)
    : invalidator.rankingChanged(ranking.albumId, ranking.userId);
}
