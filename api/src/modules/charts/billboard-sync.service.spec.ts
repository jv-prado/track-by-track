import {
  BillboardSyncService,
  BILLBOARD_SOURCE,
  BILLBOARD_200_CHART,
  type ChartEntryStore,
  type ChartSource,
} from './billboard-sync.service';
import type {
  ChartResolver,
  ChartResolveInput,
} from './chart-resolver.service';
import type { BillboardChartSnapshot } from './billboard-source.service';

class FakeSource implements ChartSource {
  calls = 0;
  snapshot: BillboardChartSnapshot = {
    chartDate: new Date('2026-08-15T00:00:00Z'),
    items: [],
  };

  fetchBillboard200(): Promise<BillboardChartSnapshot> {
    this.calls += 1;
    return Promise.resolve(this.snapshot);
  }
}

class FakeResolver implements ChartResolver {
  resolveByKey: Record<string, string | null> = {};

  resolve(item: ChartResolveInput): Promise<string | null> {
    const key = `${item.artist}|${item.name}`;
    return Promise.resolve(this.resolveByKey[key] ?? null);
  }
}

class FakeChartEntryModel implements ChartEntryStore {
  upserts: {
    filter: Record<string, unknown>;
    update: Record<string, unknown>;
  }[] = [];

  updateOne(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
  ): unknown {
    this.upserts.push({ filter, update });
    return Promise.resolve();
  }
}

function setup() {
  const source = new FakeSource();
  const resolver = new FakeResolver();
  const model = new FakeChartEntryModel();
  const service = new BillboardSyncService(source, resolver, model);
  return { service, source, resolver, model };
}

describe('BillboardSyncService', () => {
  it('resolve cada item e upserta pela chave (source, chart, chartDate, rank)', async () => {
    const { service, resolver, model, source } = setup();
    source.snapshot = {
      chartDate: new Date('2026-08-15T00:00:00Z'),
      items: [
        {
          name: 'Renaissance',
          artist: 'Beyoncé',
          rank: 1,
          lastWeekRank: 2,
          peakRank: 1,
          weeksOnChart: 10,
        },
      ],
    };
    resolver.resolveByKey['Beyoncé|Renaissance'] = 'spotify-1';

    const summary = await service.sync();

    expect(summary).toEqual({
      chartDate: '2026-08-15',
      received: 1,
      resolved: 1,
      unresolved: 0,
    });
    expect(model.upserts).toHaveLength(1);
    expect(model.upserts[0]?.filter).toEqual({
      source: BILLBOARD_SOURCE,
      chart: BILLBOARD_200_CHART,
      chartDate: source.snapshot.chartDate,
      rank: 1,
    });
    const update = model.upserts[0]?.update as {
      $set: Record<string, unknown>;
    };
    expect(update.$set.albumId).toBe('spotify-1');
    expect(update.$set.status).toBe('resolved');
  });

  it('reexecutar a mesma semana upserta pela mesma chave — idempotente', async () => {
    const { service, resolver, model, source } = setup();
    source.snapshot = {
      chartDate: new Date('2026-08-15T00:00:00Z'),
      items: [{ name: 'Renaissance', artist: 'Beyoncé', rank: 1 }],
    };
    resolver.resolveByKey['Beyoncé|Renaissance'] = 'spotify-1';

    await service.sync();
    await service.sync();

    expect(model.upserts).toHaveLength(2);
    expect(model.upserts[0]?.filter).toEqual(model.upserts[1]?.filter);
  });

  it('item sem correspondência confiável fica unresolved, sem albumId, e nunca fabrica álbum', async () => {
    const { service, model, source } = setup();
    source.snapshot = {
      chartDate: new Date('2026-08-15T00:00:00Z'),
      items: [{ name: 'Ghost Album', artist: 'Nobody', rank: 5 }],
    };

    const summary = await service.sync();

    expect(summary.unresolved).toBe(1);
    expect(summary.resolved).toBe(0);
    const update = model.upserts[0]?.update as {
      $set: Record<string, unknown>;
      $unset?: Record<string, unknown>;
    };
    expect(update.$set.status).toBe('unresolved');
    expect(update.$set).not.toHaveProperty('albumId');
    expect(update.$unset).toEqual({ albumId: '' });
  });

  it('resolve em lotes, mas processa todos os itens recebidos', async () => {
    const { service, resolver, model, source } = setup();
    const items = Array.from({ length: 25 }, (_, i) => ({
      name: `Album ${i}`,
      artist: `Artist ${i}`,
      rank: i + 1,
    }));
    source.snapshot = { chartDate: new Date('2026-08-15T00:00:00Z'), items };
    items.forEach((item) => {
      resolver.resolveByKey[`${item.artist}|${item.name}`] =
        `spotify-${item.rank}`;
    });

    const summary = await service.sync();

    expect(summary.received).toBe(25);
    expect(summary.resolved).toBe(25);
    expect(model.upserts).toHaveLength(25);
  });
});
