import { Injectable } from '@nestjs/common';
import { BaseCache } from './base-cache';
import { CacheHit } from './cache.port';

/**
 * Todo get é miss. Usado com `CACHE_DRIVER=off` e nos testes e2e — suíte que
 * depende de cache implícito passa a esconder bug de invalidação.
 */
@Injectable()
export class NullCache extends BaseCache {
  get<T>(): Promise<CacheHit<T> | null> {
    this.counters.miss += 1;
    return Promise.resolve(null);
  }

  set(): Promise<void> {
    return Promise.resolve();
  }

  setIfAbsent(): Promise<boolean> {
    return Promise.resolve(true);
  }

  del(): Promise<void> {
    return Promise.resolve();
  }

  bump(): Promise<number> {
    return Promise.resolve(0);
  }

  version(): Promise<number> {
    return Promise.resolve(0);
  }

  healthy(): Promise<boolean> {
    return Promise.resolve(true);
  }

  driver(): string {
    return 'off';
  }
}
