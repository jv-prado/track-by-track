import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from '../../config/env.schema';
import { AppMongooseModule } from '../../shared/infrastructure/database/mongoose.module';
import { CacheModule } from '../../shared/infrastructure/cache/cache.module';
import { ChartsModule } from './charts.module';

/**
 * Bootstrap mínimo pro script standalone (`scripts/sync-billboard.ts`) —
 * deliberadamente não é o `AppModule` inteiro. `NestFactory.
 * createApplicationContext` com o `AppModule` completo trava sem erro nenhum
 * neste projeto (reproduzido isolando módulo por módulo: a causa está em
 * `DiscoveryModule`, não em nada deste módulo — bug pré-existente, também
 * reproduzido em `scripts/backfill-missing-albums.ts`, que usa o `AppModule`
 * cheio e nunca foi tocado aqui). O sync só precisa de config, Mongo e cache
 * — nada de Identity/Ranking/Discovery/Comments/Follows/Notifications.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    AppMongooseModule,
    CacheModule,
    ChartsModule,
  ],
})
export class SyncBillboardModule {}
