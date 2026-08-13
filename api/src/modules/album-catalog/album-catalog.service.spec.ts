import {
  AlbumCatalogService,
  type AlbumCatalogSpotify,
  type AlbumStore,
} from './album-catalog.service';
import { InMemoryCache } from '../../shared/infrastructure/cache/in-memory-cache.adapter';
import { CacheKeys } from '../../shared/infrastructure/cache/cache-keys';
import type { AlbumSchemaClass } from './album.schema';
import type { AlbumDetail, AlbumSummary } from './spotify-normalizer';

class FakeCacheKeysConfig {
  get(key: 'CACHE_PREFIX' | 'NODE_ENV'): string {
    return key === 'NODE_ENV' ? 'test' : 'tbt';
  }
}

class FakeSpotify implements AlbumCatalogSpotify {
  searchCalls = 0;
  albumCalls = 0;
  nextAlbum: AlbumDetail | null = null;

  searchAlbums(): Promise<{ items: AlbumSummary[]; total: number }> {
    this.searchCalls += 1;
    return Promise.resolve({ items: [], total: 0 });
  }

  getAlbumWithTracks(): Promise<AlbumDetail | null> {
    this.albumCalls += 1;
    return Promise.resolve(this.nextAlbum);
  }
}

class FakeAlbumStore implements AlbumStore {
  updateOneCalls = 0;
  stored: AlbumSchemaClass | null = null;

  findOne() {
    return { lean: () => ({ exec: () => Promise.resolve(this.stored) }) };
  }

  updateOne(): unknown {
    this.updateOneCalls += 1;
    return Promise.resolve();
  }
}

function setup() {
  const spotify = new FakeSpotify();
  const store = new FakeAlbumStore();
  const cache = new InMemoryCache();
  const service = new AlbumCatalogService(
    spotify,
    store,
    cache,
    new CacheKeys(new FakeCacheKeysConfig()),
  );
  return { service, spotify, store, cache };
}

describe('AlbumCatalogService (cache)', () => {
  it('busca idêntica só bate no Spotify uma vez', async () => {
    const { service, spotify } = setup();

    await service.search('lorde', 10, 0);
    await service.search('Lorde ', 10, 0); // hash normaliza caixa e espaço
    await service.search('lorde', 10, 20); // offset diferente = chave diferente

    expect(spotify.searchCalls).toBe(2);
  });

  it('álbum inexistente é lembrado (negative cache) em vez de reconsultado', async () => {
    const { service, spotify } = setup();
    spotify.nextAlbum = null;

    expect(await service.getAlbum('nao-existe')).toBeNull();
    expect(await service.getAlbum('nao-existe')).toBeNull();

    expect(spotify.albumCalls).toBe(1);
  });

  it('álbum encontrado é persistido no catálogo com os dois tamanhos de capa', async () => {
    const { service, spotify, store } = setup();
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
  });

  it('álbum fresco no catálogo não chama o Spotify', async () => {
    const { service, spotify, store } = setup();
    store.stored = {
      _id: 'x',
      spotifyId: 'abc',
      name: 'Pure Heroine',
      artist: 'Lorde',
      imageUrl: 'https://img/640.jpg',
      imageUrlSmall: 'https://img/300.jpg',
      tracks: [],
      cachedAt: new Date(),
    };

    const album = await service.getAlbum('abc');

    expect(album?.name).toBe('Pure Heroine');
    expect(spotify.albumCalls).toBe(0);
  });
});
