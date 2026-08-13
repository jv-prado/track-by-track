import { Injectable } from '@nestjs/common';
import { BaseCache } from './base-cache';
import { CacheHit } from './cache.port';

/** Teto de chaves. Estourar evita que o processo cresça sem limite em produção. */
const MAX_ENTRIES = 5_000;

interface Entry {
  payload: string;
  expiresAt: number;
}

/**
 * Cache em processo. É o default: com uma única instância da API entrega o mesmo
 * ganho do Redis (ver seção 0 do docs/CACHE-REDIS.md) sem infraestrutura nova.
 * Não sobrevive a restart e não é compartilhado entre instâncias — quando isso
 * passar a importar, troca-se `CACHE_DRIVER=redis` e nada mais.
 */
@Injectable()
export class InMemoryCache extends BaseCache {
  private readonly entries = new Map<string, Entry>();
  private readonly versions = new Map<string, number>();

  get<T>(key: string): Promise<CacheHit<T> | null> {
    const entry = this.entries.get(key);
    if (!entry) {
      this.counters.miss += 1;
      return Promise.resolve(null);
    }
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      this.counters.miss += 1;
      return Promise.resolve(null);
    }
    // reinsere para que a ordem do Map aproxime LRU na hora de evictar
    this.entries.delete(key);
    this.entries.set(key, entry);
    this.counters.hit += 1;
    return Promise.resolve({ value: JSON.parse(entry.payload) as T });
  }

  set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (this.entries.size >= MAX_ENTRIES) {
      const oldest = this.entries.keys().next();
      if (!oldest.done) this.entries.delete(oldest.value);
    }
    this.entries.set(key, {
      payload: JSON.stringify(value ?? null),
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    return Promise.resolve();
  }

  async setIfAbsent<T>(
    key: string,
    value: T,
    ttlSeconds: number,
  ): Promise<boolean> {
    const existing = this.entries.get(key);
    if (existing && existing.expiresAt > Date.now()) return false;
    await this.set(key, value, ttlSeconds);
    return true;
  }

  del(...keys: string[]): Promise<void> {
    keys.forEach((key) => this.entries.delete(key));
    return Promise.resolve();
  }

  bump(key: string): Promise<number> {
    const next = (this.versions.get(key) ?? 0) + 1;
    this.versions.set(key, next);
    return Promise.resolve(next);
  }

  version(key: string): Promise<number> {
    return Promise.resolve(this.versions.get(key) ?? 0);
  }

  healthy(): Promise<boolean> {
    return Promise.resolve(true);
  }

  driver(): string {
    return 'memory';
  }
}
