import type { RankingRepository } from '../domain/repositories/ranking.repository';
import type { AlbumRanking } from '../domain/entities/album-ranking.aggregate';
import type { CacheInvalidator } from '../../../shared/application/ports/cache-invalidator.port';
import { invalidateRankingCache } from './invalidate-ranking-cache';

/**
 * Ponto único por onde toda mutação do agregado passa em vez de chamar
 * `rankings.save` direto. Depois de avaliar/ignorar/resetar, o ranking pode
 * ter ficado vazio (`isEmpty` — ver album-ranking.aggregate.ts): nesse caso
 * ele é removido do banco em vez de salvo, pra não sobrar lixo inflando
 * estatística e listagem (era exatamente o que fazia "18 álbuns" na tela
 * "meus rankings" não bater com os 5 realmente avaliados).
 */
export async function persistRanking(
  rankings: RankingRepository,
  cacheInvalidator: CacheInvalidator,
  ranking: AlbumRanking,
  wasComplete: boolean,
): Promise<void> {
  if (ranking.isEmpty) {
    await rankings.delete(ranking.id.toString());
    // Esvaziar é mudança pública em potencial pelo mesmo motivo que apagar
    // (delete-ranking.use-case.ts): some do feed/média se estava completo.
    await cacheInvalidator.publicRankingsChanged(
      ranking.albumId,
      ranking.userId,
    );
    return;
  }
  await rankings.save(ranking);
  await invalidateRankingCache(cacheInvalidator, ranking, wasComplete);
}
