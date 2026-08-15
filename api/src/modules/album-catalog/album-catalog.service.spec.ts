import { Types } from 'mongoose';
import {
  AlbumCatalogService,
  type AlbumCatalogAppleCharts,
  type AlbumCatalogPreviewSource,
  type AlbumCatalogSpotify,
  type AlbumStore,
} from './album-catalog.service';
import type { ChartAlbumRaw } from './apple-top-albums.service';
import { InMemoryCache } from '../../shared/infrastructure/cache/in-memory-cache.adapter';
import { CacheKeys } from '../../shared/infrastructure/cache/cache-keys';
import type { AlbumSchemaClass } from './album.schema';
import type {
  AlbumDetail,
  AlbumSummary,
  RecentRelease,
} from './spotify-normalizer';

class FakeCacheKeysConfig {
  get(key: 'CACHE_PREFIX' | 'NODE_ENV'): string {
    return key === 'NODE_ENV' ? 'test' : 'tbt';
  }
}

class FakeSpotify implements AlbumCatalogSpotify {
  searchCalls = 0;
  albumCalls = 0;
  newReleasesCalls = 0;
  nextAlbum: AlbumDetail | null = null;
  /** Álbum devolvido por id específico — usado nos testes de filtro de gênero. */
  albumsById: Record<string, AlbumDetail> = {};
  /** Resultado de busca por query (minúsculo) — usado na resolução do chart da Apple. */
  searchResultsByQuery: Record<string, AlbumSummary[]> = {};
  recentReleases: RecentRelease[] = [];

  searchAlbums(
    query: string,
  ): Promise<{ items: AlbumSummary[]; total: number }> {
    this.searchCalls += 1;
    const items = this.searchResultsByQuery[query.toLowerCase()] ?? [];
    return Promise.resolve({ items, total: items.length });
  }

  getAlbumWithTracks(spotifyId: string): Promise<AlbumDetail | null> {
    this.albumCalls += 1;
    return Promise.resolve(this.albumsById[spotifyId] ?? this.nextAlbum);
  }

  getRecentReleases(): Promise<RecentRelease[]> {
    this.newReleasesCalls += 1;
    return Promise.resolve(this.recentReleases);
  }
}

class FakeAppleCharts implements AlbumCatalogAppleCharts {
  fetchCalls = 0;
  chart: ChartAlbumRaw[] = [];

  fetchChart(): Promise<ChartAlbumRaw[]> {
    this.fetchCalls += 1;
    return Promise.resolve(this.chart);
  }
}

function summary(spotifyId: string): AlbumSummary {
  return { spotifyId, name: spotifyId, artist: 'Artist' };
}

function release(spotifyId: string, genres: string[] = []): RecentRelease {
  return { ...summary(spotifyId), genres };
}

class FakePreviewSource implements AlbumCatalogPreviewSource {
  calls = 0;
  nextPreviewUrl: string | undefined = undefined;

  fetchPreview(): Promise<string | undefined> {
    this.calls += 1;
    return Promise.resolve(this.nextPreviewUrl);
  }
}

class FakeAlbumStore implements AlbumStore {
  updateOneCalls = 0;
  stored: AlbumSchemaClass | null = null;
  /** O que a busca local (índice de texto) devolve — ver AlbumCatalogService.search. */
  textSearchResults: AlbumSchemaClass[] = [];
  lastTextQuery: string | null = null;
  upserts: { filter: unknown; update: Record<string, unknown> }[] = [];

  findOne() {
    return { lean: () => ({ exec: () => Promise.resolve(this.stored) }) };
  }

  find(filter: Record<string, unknown>) {
    const text = filter.$text as { $search: string } | undefined;
    this.lastTextQuery = text?.$search ?? null;
    const results = this.textSearchResults;
    return {
      sort: () => ({
        limit: (limit: number) => ({
          lean: () => ({
            exec: () => Promise.resolve(results.slice(0, limit)),
          }),
        }),
      }),
    };
  }

  updateOne(
    filter: { spotifyId: string },
    update: Record<string, unknown>,
  ): unknown {
    this.updateOneCalls += 1;
    this.upserts.push({ filter, update });
    return Promise.resolve();
  }
}

function albumDoc(spotifyId: string): AlbumSchemaClass {
  return {
    _id: new Types.ObjectId(),
    spotifyId,
    name: spotifyId,
    artist: 'Artist',
    tracks: [],
    genres: [],
    curatedGenres: [],
    cachedAt: new Date(),
  };
}

function setup() {
  const spotify = new FakeSpotify();
  const previewSource = new FakePreviewSource();
  const appleCharts = new FakeAppleCharts();
  const store = new FakeAlbumStore();
  const cache = new InMemoryCache();
  const service = new AlbumCatalogService(
    spotify,
    previewSource,
    appleCharts,
    store,
    cache,
    new CacheKeys(new FakeCacheKeysConfig()),
  );
  return { service, spotify, previewSource, appleCharts, store, cache };
}

describe('AlbumCatalogService (cache)', () => {
  it('busca idêntica só bate no Spotify uma vez', async () => {
    const { service, spotify } = setup();

    await service.search('lorde', 10, 0);
    await service.search('Lorde ', 10, 0); // hash normaliza caixa e espaço
    await service.search('lorde', 10, 20); // offset diferente = chave diferente

    expect(spotify.searchCalls).toBe(2);
  });

  it('catálogo local com resultado suficiente evita o Spotify', async () => {
    const { service, spotify, store } = setup();
    store.textSearchResults = [albumDoc('a'), albumDoc('b')];

    const result = await service.search('nevermind', 2, 0);

    expect(spotify.searchCalls).toBe(0);
    expect(store.lastTextQuery).toBe('nevermind');
    expect(result.items.map((i) => i.spotifyId)).toEqual(['a', 'b']);
  });

  it('catálogo local insuficiente cai pro Spotify', async () => {
    const { service, spotify, store } = setup();
    store.textSearchResults = [albumDoc('a')];

    await service.search('nevermind', 5, 0);

    expect(spotify.searchCalls).toBe(1);
  });

  it('paginação além da primeira página nunca usa o local', async () => {
    const { service, spotify, store } = setup();
    // Local tem de sobra, mas misturar as duas fontes repetiria/pularia item:
    // o `total` local não tem relação com o do Spotify.
    store.textSearchResults = [albumDoc('a'), albumDoc('b'), albumDoc('c')];

    await service.search('nevermind', 2, 20);

    expect(spotify.searchCalls).toBe(1);
    expect(store.lastTextQuery).toBeNull();
  });

  it('resultado do Spotify alimenta o catálogo sem forjar frescor nem apagar faixas', async () => {
    const { service, spotify, store } = setup();
    spotify.searchResultsByQuery = { nirvana: [summary('x')] };

    await service.search('nirvana', 5, 0);

    const upsert = store.upserts.at(-1);
    const set = upsert?.update.$set as Record<string, unknown>;
    const setOnInsert = upsert?.update.$setOnInsert as Record<string, unknown>;
    // `tracks` só no insert: doc já completo não pode ser degradado pra sem faixas.
    expect(set).not.toHaveProperty('tracks');
    expect(set).not.toHaveProperty('cachedAt');
    expect(setOnInsert.tracks).toEqual([]);
    // epoch = nasce stale, então getAlbum busca o álbum completo na primeira visita.
    expect((setOnInsert.cachedAt as Date).getTime()).toBe(0);
  });

  it('álbum inexistente é lembrado (negative cache) em vez de reconsultado', async () => {
    const { service, spotify } = setup();
    spotify.nextAlbum = null;

    expect(await service.getAlbum('nao-existe')).toBeNull();
    expect(await service.getAlbum('nao-existe')).toBeNull();

    expect(spotify.albumCalls).toBe(1);
  });

  it('álbum encontrado é persistido no catálogo com os dois tamanhos de capa', async () => {
    const { service, spotify, store, previewSource } = setup();
    spotify.nextAlbum = {
      spotifyId: 'abc',
      name: 'Pure Heroine',
      artist: 'Lorde',
      imageUrl: 'https://img/640.jpg',
      imageUrlSmall: 'https://img/300.jpg',
      tracks: [],
    };

    const album = await service.getAlbum('abc');

    expect(album?.imageUrlSmall).toBe('https://img/300.jpg');
    expect(store.updateOneCalls).toBe(1);
    // prévia é sob demanda (por clique) — carregar o álbum não bate no iTunes.
    expect(previewSource.calls).toBe(0);
  });

  it('álbum fresco no catálogo não chama o Spotify', async () => {
    const { service, spotify, store } = setup();
    store.stored = {
      _id: new Types.ObjectId(),
      spotifyId: 'abc',
      name: 'Pure Heroine',
      artist: 'Lorde',
      imageUrl: 'https://img/640.jpg',
      imageUrlSmall: 'https://img/300.jpg',
      tracks: [],
      genres: ['pop'],
      curatedGenres: ['pop'],
      cachedAt: new Date(),
    };

    const album = await service.getAlbum('abc');

    expect(album?.name).toBe('Pure Heroine');
    expect(spotify.albumCalls).toBe(0);
  });
});

describe('AlbumCatalogService (new releases do Spotify)', () => {
  it('pagina a lista em memória e reporta o total real', async () => {
    const { service, spotify } = setup();
    spotify.recentReleases = [release('s1'), release('s2'), release('s3')];

    const result = await service.newReleases(undefined, 2, 2);

    expect(result.items.map((item) => item.spotifyId)).toEqual(['s3']);
    expect(result.total).toBe(3);
  });

  it('página seguinte não custa chamada nova ao Spotify', async () => {
    const { service, spotify } = setup();
    spotify.recentReleases = [release('s1'), release('s2')];

    await service.newReleases(undefined, 1, 1);
    await service.newReleases(undefined, 2, 1);

    expect(spotify.newReleasesCalls).toBe(1);
  });

  it('filtra por categoria curada a partir da tag crua do artista', async () => {
    const { service, spotify } = setup();
    spotify.recentReleases = [
      release('rap', ['brazilian hip hop']),
      release('rock', ['classic rock']),
    ];

    const result = await service.newReleases('hip-hop', 1, 10);

    expect(result.items.map((item) => item.spotifyId)).toEqual(['rap']);
    expect(result.total).toBe(1);
  });

  it('filtrar por gênero não custa chamada nova — é a mesma lista cacheada', async () => {
    const { service, spotify } = setup();
    spotify.recentReleases = [
      release('rock', ['classic rock']),
      release('pop', ['dance pop']),
    ];

    await service.newReleases(undefined, 1, 10);
    await service.newReleases('rock', 1, 10);
    await service.newReleases('pop', 1, 10);

    expect(spotify.newReleasesCalls).toBe(1);
  });

  it('lista só as categorias que têm álbum na leva atual', async () => {
    const { service, spotify } = setup();
    spotify.recentReleases = [
      release('a', ['sertanejo universitário']),
      release('b', ['classic rock']),
    ];

    expect(await service.newReleasesGenres()).toEqual(['rock', 'sertanejo']);
  });

  it('ordena as categorias pela quantidade de álbuns, não por alfabeto', async () => {
    const { service, spotify } = setup();
    spotify.recentReleases = [
      release('a', ['classic rock']),
      release('b', ['hard rock']),
      release('c', ['bossa nova']),
    ];

    // alfabético colocaria "jazz" na frente; quem tem mais álbum é que sobe
    expect(await service.newReleasesGenres()).toEqual(['rock', 'jazz']);
  });
});

describe('AlbumCatalogService (chart Top Albums da Apple)', () => {
  it('resolve cada item do chart pro spotifyId equivalente via busca "artista álbum"', async () => {
    const { service, spotify, appleCharts } = setup();
    appleCharts.chart = [
      {
        artistName: 'Artist A',
        name: 'Album A',
        releaseDate: '2026-01-01',
        imageUrl: 'https://img/a.jpg',
        genres: ['Rock'],
      },
    ];
    spotify.searchResultsByQuery['artist a album a'] = [summary('spotify-a')];

    const result = await service.topAlbumsChart(undefined, 1, 20);

    expect(result.items).toEqual([
      {
        spotifyId: 'spotify-a',
        name: 'Album A',
        artist: 'Artist A',
        imageUrl: 'https://img/a.jpg',
        releaseDate: '2026-01-01',
        genres: ['Rock'],
      },
    ]);
    expect(result.total).toBe(1);
  });

  it('item sem correspondência no Spotify é descartado — não dá pra ranquear sem faixas', async () => {
    const { service, appleCharts } = setup();
    appleCharts.chart = [{ artistName: 'Ghost', name: 'Nowhere', genres: [] }];

    const result = await service.topAlbumsChart(undefined, 1, 20);

    expect(result.items).toEqual([]);
  });

  it('filtra por gênero depois de resolvido', async () => {
    const { service, spotify, appleCharts } = setup();
    appleCharts.chart = [
      { artistName: 'A', name: 'Rock Album', genres: ['Rock'] },
      { artistName: 'B', name: 'Jazz Album', genres: ['Jazz'] },
    ];
    spotify.searchResultsByQuery['a rock album'] = [summary('s1')];
    spotify.searchResultsByQuery['b jazz album'] = [summary('s2')];

    const result = await service.topAlbumsChart('Rock', 1, 20);

    expect(result.items.map((i) => i.spotifyId)).toEqual(['s1']);
  });

  it('chart resolvido fica em cache — segunda chamada não bate na Apple nem refaz buscas', async () => {
    const { service, spotify, appleCharts } = setup();
    appleCharts.chart = [{ artistName: 'A', name: 'Album', genres: [] }];
    spotify.searchResultsByQuery['a album'] = [summary('s1')];

    await service.topAlbumsChart(undefined, 1, 20);
    const searchCallsAfterFirst = spotify.searchCalls;
    const fetchCallsAfterFirst = appleCharts.fetchCalls;

    await service.topAlbumsChart(undefined, 1, 20);

    expect(spotify.searchCalls).toBe(searchCallsAfterFirst);
    expect(appleCharts.fetchCalls).toBe(fetchCallsAfterFirst);
  });

  it('topAlbumsChartGenres devolve gêneros distintos e ordenados', async () => {
    const { service, spotify, appleCharts } = setup();
    appleCharts.chart = [
      { artistName: 'A', name: 'X', genres: ['Rock', 'Pop'] },
      { artistName: 'B', name: 'Y', genres: ['Pop'] },
    ];
    spotify.searchResultsByQuery['a x'] = [summary('s1')];
    spotify.searchResultsByQuery['b y'] = [summary('s2')];

    const genres = await service.topAlbumsChartGenres();

    expect(genres).toEqual(['Pop', 'Rock']);
  });
});

describe('AlbumCatalogService (prévia sob demanda)', () => {
  it('busca no iTunes só quando alguém pede a prévia da faixa', async () => {
    const { service, spotify, previewSource } = setup();
    spotify.nextAlbum = {
      spotifyId: 'abc',
      name: 'Pure Heroine',
      artist: 'Lorde',
      tracks: [
        {
          spotifyId: 't1',
          name: 'Tennis Court',
          durationMs: 1000,
          trackNumber: 1,
        },
      ],
    };
    previewSource.nextPreviewUrl = 'https://preview/tennis-court.m4a';

    expect(previewSource.calls).toBe(0);

    const previewUrl = await service.getTrackPreview('abc', 't1');

    expect(previewUrl).toBe('https://preview/tennis-court.m4a');
    expect(previewSource.calls).toBe(1);
  });

  it('resultado (inclusive miss) fica em cache — clique repetido não bate no iTunes de novo', async () => {
    const { service, spotify, previewSource } = setup();
    spotify.nextAlbum = {
      spotifyId: 'abc',
      name: 'Pure Heroine',
      artist: 'Lorde',
      tracks: [
        {
          spotifyId: 't1',
          name: 'Tennis Court',
          durationMs: 1000,
          trackNumber: 1,
        },
      ],
    };
    previewSource.nextPreviewUrl = undefined; // iTunes não achou

    const first = await service.getTrackPreview('abc', 't1');
    const second = await service.getTrackPreview('abc', 't1');

    expect(first).toBeNull();
    expect(second).toBeNull();
    expect(previewSource.calls).toBe(1);
  });

  it('faixa que não existe no álbum devolve null sem chamar o iTunes', async () => {
    const { service, spotify, previewSource } = setup();
    spotify.nextAlbum = {
      spotifyId: 'abc',
      name: 'Pure Heroine',
      artist: 'Lorde',
      tracks: [],
    };

    const previewUrl = await service.getTrackPreview('abc', 'nao-existe');

    expect(previewUrl).toBeNull();
    expect(previewSource.calls).toBe(0);
  });
});
