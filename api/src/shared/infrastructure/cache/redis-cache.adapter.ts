import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { BaseCache } from './base-cache';
import { CacheHit } from './cache.port';

/** Redis lento é pior que Redis ausente — 150ms e a request segue para o Mongo. */
const COMMAND_TIMEOUT_MS = 150;
/** Redis fora do ar loga uma vez por janela, não uma vez por request. */
const WARN_THROTTLE_MS = 30_000;

@Injectable()
export class RedisCache extends BaseCache implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCache.name);
  private readonly client: Redis;
  private lastWarnAt = 0;

  constructor(url: string) {
    super();
    this.client = new Redis(url, {
      commandTimeout: COMMAND_TIMEOUT_MS,
      maxRetriesPerRequest: 1,
      // sem fila offline: comando durante queda falha na hora em vez de acumular
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    // sem handler de 'error' o ioredis derruba o processo com unhandled error
    this.client.on('error', (error: Error) => this.warn('conexão', error));
    void this.client.connect().catch((error: Error) => {
      this.warn('conexão inicial', error);
    });
  }

  async get<T>(key: string): Promise<CacheHit<T> | null> {
    try {
      const payload = await this.client.get(key);
      if (payload === null) {
        this.counters.miss += 1;
        return null;
      }
      this.counters.hit += 1;
      return { value: JSON.parse(payload) as T };
    } catch (error) {
      this.onError('get', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await this.client.set(
        key,
        JSON.stringify(value ?? null),
        'EX',
        ttlSeconds,
      );
    } catch (error) {
      this.onError('set', error);
    }
  }

  async setIfAbsent<T>(
    key: string,
    value: T,
    ttlSeconds: number,
  ): Promise<boolean> {
    try {
      const result = await this.client.set(
        key,
        JSON.stringify(value ?? null),
        'EX',
        ttlSeconds,
        'NX',
      );
      return result === 'OK';
    } catch (error) {
      this.onError('setIfAbsent', error);
      // Redis fora do ar: ninguém "ganha" o lock, todos seguem pelo caminho lento
      return false;
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      await this.client.del(...keys);
    } catch (error) {
      this.onError('del', error);
    }
  }

  async bump(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      this.onError('bump', error);
      return 0;
    }
  }

  async version(key: string): Promise<number> {
    try {
      const raw = await this.client.get(key);
      return raw === null ? 0 : Number(raw);
    } catch (error) {
      this.onError('version', error);
      return 0;
    }
  }

  async healthy(): Promise<boolean> {
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  driver(): string {
    return 'redis';
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => this.client.disconnect());
  }

  private onError(operation: string, error: unknown): void {
    this.counters.error += 1;
    this.warn(operation, error);
  }

  private warn(operation: string, error: unknown): void {
    const now = Date.now();
    if (now - this.lastWarnAt < WARN_THROTTLE_MS) return;
    this.lastWarnAt = now;
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(
      `Redis indisponível (${operation}: ${message}) — servindo do Mongo`,
    );
  }
}
