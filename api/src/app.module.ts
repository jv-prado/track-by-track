import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppThrottlerGuard } from './shared/infrastructure/guards/app-throttler.guard';
import { LoggerModule } from 'nestjs-pino';
import type { Env } from './config/env.schema';
import { validateEnv } from './config/env.schema';
import { AppMongooseModule } from './shared/infrastructure/database/mongoose.module';
import { CacheModule } from './shared/infrastructure/cache/cache.module';
import { DomainExceptionFilter } from './shared/infrastructure/filters/domain-exception.filter';
import { HealthModule } from './modules/health/health.module';
import { IdentityModule } from './modules/identity/identity.module';
import { AlbumCatalogModule } from './modules/album-catalog/album-catalog.module';
import { RankingModule } from './modules/ranking/ranking.module';
import { DiscoveryModule } from './modules/discovery/discovery.module';
import { CommentsModule } from './modules/comments/comments.module';
import { FollowsModule } from './modules/follows/follows.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: {
          level: config.get('NODE_ENV') === 'production' ? 'info' : 'debug',
          genReqId: (req: { headers: Record<string, unknown> }) =>
            (req.headers['x-request-id'] as string | undefined) ?? randomUUID(),
          // Sem log automático de "request completed"/"request errored" por
          // chamada — isso já dá pra ver na aba Network do devtools. O que sobra
          // aqui é log de verdade: erros 5xx (DomainExceptionFilter) e o que
          // cada use case decidir logar.
          autoLogging: false,
          transport:
            config.get('NODE_ENV') === 'production'
              ? undefined
              : { target: 'pino-pretty', options: { singleLine: true } },
        },
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    AppMongooseModule,
    CacheModule,
    HealthModule,
    IdentityModule,
    AlbumCatalogModule,
    RankingModule,
    DiscoveryModule,
    CommentsModule,
    FollowsModule,
    NotificationsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
  ],
})
export class AppModule {}
