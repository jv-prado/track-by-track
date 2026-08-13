import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../config/env.schema';
import { CACHE, type Cache } from './cache.port';
import { CACHE_INVALIDATOR } from '../../application/ports/cache-invalidator.port';
import { VersionCacheInvalidator } from './cache-invalidator.adapter';
import { CacheKeys } from './cache-keys';
import { InMemoryCache } from './in-memory-cache.adapter';
import { NullCache } from './null-cache.adapter';
import { RedisCache } from './redis-cache.adapter';

@Global()
@Module({
  providers: [
    CacheKeys,
    {
      provide: CACHE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): Cache => {
        const driver = config.get('CACHE_DRIVER', { infer: true });
        const logger = new Logger('CacheModule');

        if (driver === 'off') {
          logger.log('Cache desligado (CACHE_DRIVER=off)');
          return new NullCache();
        }
        if (driver === 'redis') {
          const url = config.get('REDIS_URL', { infer: true });
          // env.schema já barra isso no boot; aqui é o tipo que ainda é opcional
          if (!url) throw new Error('REDIS_URL ausente com CACHE_DRIVER=redis');
          logger.log('Cache em Redis');
          return new RedisCache(url);
        }
        logger.log('Cache em memória (single-instance)');
        return new InMemoryCache();
      },
    },
    { provide: CACHE_INVALIDATOR, useClass: VersionCacheInvalidator },
  ],
  exports: [CACHE, CACHE_INVALIDATOR, CacheKeys],
})
export class CacheModule {}
