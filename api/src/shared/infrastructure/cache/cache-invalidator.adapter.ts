import { Inject, Injectable } from '@nestjs/common';
import { CACHE, type Cache } from './cache.port';
import { CacheKeys } from './cache-keys';
import type { CacheInvalidator } from '../../application/ports/cache-invalidator.port';

/**
 * Traduz intenção em `INCR` de versão. Bump é O(1) e deixa as chaves da versão
 * anterior órfãs (morrem no TTL) — nada de `SCAN`/`KEYS` para achar o que apagar.
 */
@Injectable()
export class VersionCacheInvalidator implements CacheInvalidator {
  constructor(
    @Inject(CACHE) private readonly cache: Cache,
    @Inject(CacheKeys) private readonly keys: CacheKeys,
  ) {}

  async publicRankingsChanged(albumId: string, userId: string): Promise<void> {
    await Promise.all([
      this.cache.bump(this.keys.versionRankings()),
      this.cache.bump(this.keys.versionAlbum(albumId)),
      this.cache.bump(this.keys.versionUser(userId)),
    ]);
  }

  async rankingChanged(albumId: string, userId: string): Promise<void> {
    // Feed e top-albums só listam ranking completo: nota parcial não muda nenhum
    // dos dois, e bumpar aqui jogaria o cache do feed fora a cada estrela clicada.
    await Promise.all([
      this.cache.bump(this.keys.versionAlbum(albumId)),
      this.cache.bump(this.keys.versionUser(userId)),
    ]);
  }

  async userProfileChanged(userId: string): Promise<void> {
    // Feed embute userDisplayName/userAvatarUrl via $lookup: trocar o nome sem
    // bumpar `ver:rankings` deixaria o nome antigo na timeline até o TTL.
    await Promise.all([
      this.cache.bump(this.keys.versionRankings()),
      this.cache.bump(this.keys.versionUser(userId)),
    ]);
  }
}
