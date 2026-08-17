import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { BillboardSourceService } from './billboard-source.service';
import type {
  BillboardChartItem,
  BillboardChartSnapshot,
} from './billboard-source.service';
import { ChartResolverService } from './chart-resolver.service';
import type { ChartResolver } from './chart-resolver.service';
import { ChartEntrySchemaClass } from './chart-entry.schema';

export const BILLBOARD_SOURCE = 'billboard';
export const BILLBOARD_200_CHART = 'billboard-200';

/**
 * Resolvido em lotes — mesmo tamanho e motivo do chart da Apple (ver
 * `album-catalog.service.ts`, `CHART_RESOLVE_BATCH_SIZE`): 12 em paralelo
 * passa sem 429 no Spotify (spec §22).
 */
const RESOLVE_BATCH_SIZE = 12;

/** Fatia mínima que o sync precisa da fonte — fake simples nos testes. */
export interface ChartSource {
  fetchBillboard200(): Promise<BillboardChartSnapshot>;
}

/** Fatia mínima de `Model<ChartEntrySchemaClass>` que o sync escreve — fake simples nos testes. */
export interface ChartEntryStore {
  updateOne(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options: { upsert: boolean },
  ): unknown;
}

export interface BillboardSyncSummary {
  chartDate: string;
  received: number;
  resolved: number;
  unresolved: number;
}

@Injectable()
export class BillboardSyncService {
  private readonly logger = new Logger(BillboardSyncService.name);

  constructor(
    @Inject(BillboardSourceService) private readonly source: ChartSource,
    @Inject(ChartResolverService) private readonly resolver: ChartResolver,
    @InjectModel(ChartEntrySchemaClass.name)
    private readonly chartEntryModel: ChartEntryStore,
  ) {}

  /**
   * Terça 6h: o billboard-json costuma publicar a semana nova segunda à noite
   * (horário dos EUA) — terça de manhã dá folga suficiente sem atrasar uma
   * semana inteira caso a fonte publique um pouco depois do previsto.
   */
  @Cron('0 6 * * 2')
  async syncScheduled(): Promise<void> {
    await this.sync();
  }

  async sync(): Promise<BillboardSyncSummary> {
    this.logger.log('[Charts] Iniciando sync do Billboard 200');
    const { chartDate, items } = await this.source.fetchBillboard200();
    this.logger.log(`[Charts] ${items.length} entradas recebidas`);

    let resolved = 0;
    let unresolved = 0;

    for (let i = 0; i < items.length; i += RESOLVE_BATCH_SIZE) {
      const batch = items.slice(i, i + RESOLVE_BATCH_SIZE);
      const outcomes = await Promise.all(
        batch.map((item) => this.upsertEntry(chartDate, item)),
      );
      for (const outcome of outcomes) {
        if (outcome === 'resolved') resolved += 1;
        else unresolved += 1;
      }
    }

    this.logger.log(
      `[Charts] Sync concluído: ${resolved} resolvidos · ${unresolved} não resolvidos`,
    );

    return {
      chartDate: chartDate.toISOString().slice(0, 10),
      received: items.length,
      resolved,
      unresolved,
    };
  }

  private async upsertEntry(
    chartDate: Date,
    item: BillboardChartItem,
  ): Promise<'resolved' | 'unresolved'> {
    const albumId = await this.resolver
      .resolve({ name: item.name, artist: item.artist })
      .catch(() => null);

    const set: Record<string, unknown> = {
      lastWeekRank: item.lastWeekRank,
      peakRank: item.peakRank,
      weeksOnChart: item.weeksOnChart,
      status: albumId ? 'resolved' : 'unresolved',
      sourceName: item.name,
      sourceArtist: item.artist,
      sourceImageUrl: item.imageUrl,
    };
    if (albumId) set.albumId = albumId;

    await this.chartEntryModel.updateOne(
      {
        source: BILLBOARD_SOURCE,
        chart: BILLBOARD_200_CHART,
        chartDate,
        rank: item.rank,
      },
      // sem `albumId` resolvido, nunca deixa um valor antigo grudado num item
      // que passou a não bater mais (ex: fonte trocou o nome do álbum).
      albumId ? { $set: set } : { $set: set, $unset: { albumId: '' } },
      { upsert: true },
    );

    return albumId ? 'resolved' : 'unresolved';
  }
}
