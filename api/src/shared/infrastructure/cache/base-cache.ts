import { Cache, CacheHit, CacheStats } from './cache.port';

/**
 * Parte comum a todos os adapters: read-through, dedupe em processo e contadores.
 * O dedupe resolve o stampede dentro de uma instância sem lock distribuído — N
 * requests concorrentes na mesma chave executam a `factory` uma vez só.
 */
export abstract class BaseCache implements Cache {
  private readonly inFlight = new Map<string, Promise<unknown>>();
  protected readonly counters: CacheStats = { hit: 0, miss: 0, error: 0 };

  abstract get<T>(key: string): Promise<CacheHit<T> | null>;
  abstract set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  abstract setIfAbsent<T>(
    key: string,
    value: T,
    ttlSeconds: number,
  ): Promise<boolean>;
  abstract del(...keys: string[]): Promise<void>;
  abstract bump(key: string): Promise<number>;
  abstract version(key: string): Promise<number>;
  abstract healthy(): Promise<boolean>;
  abstract driver(): string;

  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) return cached.value;

    const pending = this.inFlight.get(key) as Promise<T> | undefined;
    if (pending) return pending;

    const promise = (async () => {
      const value = await factory();
      await this.set(key, value, ttlSeconds);
      return value;
    })().finally(() => this.inFlight.delete(key));

    this.inFlight.set(key, promise);
    return promise;
  }

  stats(): CacheStats {
    return { ...this.counters };
  }
}
