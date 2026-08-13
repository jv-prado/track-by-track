export const CACHE = Symbol('Cache');

/**
 * Envelope de leitura. Existe para separar "não tem no cache" de "tem, e o valor
 * cacheado é null" — é o que permite negative caching (álbum inexistente do
 * Spotify) sem transformar cada 404 em nova chamada externa.
 */
export interface CacheHit<T> {
  value: T;
}

export interface CacheStats {
  hit: number;
  miss: number;
  error: number;
}

export interface Cache {
  get<T>(key: string): Promise<CacheHit<T> | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  /**
   * `SET NX EX`. Devolve false quando a chave já existia — é o lock distribuído
   * usado onde o trabalho é caro o suficiente para não valer duplicar entre
   * instâncias (token do Spotify).
   */
  setIfAbsent<T>(key: string, value: T, ttlSeconds: number): Promise<boolean>;
  del(...keys: string[]): Promise<void>;
  /** Contador monotônico usado como versão de invalidação. */
  bump(key: string): Promise<number>;
  version(key: string): Promise<number>;
  /** Read-through com dedupe de requests concorrentes na mesma chave. */
  getOrSet<T>(
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
  ): Promise<T>;
  stats(): CacheStats;
  healthy(): Promise<boolean>;
  driver(): string;
}
