import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { SyncBillboardModule } from '../src/modules/charts/sync-billboard.module';
import { BillboardSyncService } from '../src/modules/charts/billboard-sync.service';

/**
 * Backfill/rerun manual do sync do Billboard 200 — mesmo caminho do cron
 * semanal (`BillboardSyncService.syncScheduled`), disparável por ops sem
 * esperar terça de manhã. Idempotente: reexecutar na mesma semana só
 * atualiza os mesmos docs (upsert pela chave (source, chart, chartDate, rank)
 * — ver chart-entry.schema.ts).
 *
 * Uso: npx tsx scripts/sync-billboard.ts
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(SyncBillboardModule, {
    logger: false,
  });

  try {
    const sync = app.get(BillboardSyncService);
    const summary = await sync.sync();
    console.log(summary);
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
