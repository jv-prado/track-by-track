import type { CacheInvalidator } from './cache-invalidator.port';

/**
 * Registra as chamadas em vez de invalidar. Deixa o teste afirmar a decisão de
 * invalidação — "avaliar faixa de ranking incompleto NÃO mexe no feed" é regra,
 * e regra sem teste volta na primeira refatoração.
 */
export class FakeCacheInvalidator implements CacheInvalidator {
  publicRankings: { albumId: string; userId: string }[] = [];
  rankings: { albumId: string; userId: string }[] = [];
  userProfiles: string[] = [];

  publicRankingsChanged(albumId: string, userId: string): Promise<void> {
    this.publicRankings.push({ albumId, userId });
    return Promise.resolve();
  }

  rankingChanged(albumId: string, userId: string): Promise<void> {
    this.rankings.push({ albumId, userId });
    return Promise.resolve();
  }

  userProfileChanged(userId: string): Promise<void> {
    this.userProfiles.push(userId);
    return Promise.resolve();
  }
}
