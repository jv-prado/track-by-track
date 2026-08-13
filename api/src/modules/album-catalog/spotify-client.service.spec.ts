import { SpotifyClientService } from './spotify-client.service';
import { InMemoryCache } from '../../shared/infrastructure/cache/in-memory-cache.adapter';
import { CacheKeys } from '../../shared/infrastructure/cache/cache-keys';
import {
  SpotifyHttpClient,
  SpotifyHttpRequestConfig,
  SpotifyHttpResponse,
  SpotifyNotFoundError,
} from './spotify-http-client';

class FakeSpotifyHttpClient implements SpotifyHttpClient {
  postCalls: {
    url: string;
    body: unknown;
    config?: SpotifyHttpRequestConfig;
  }[] = [];
  getCalls: { url: string; config?: SpotifyHttpRequestConfig }[] = [];
  nextGetResponse: unknown = null;
  shouldFailNextGetWithNotFound = false;

  post<T>(
    url: string,
    body: unknown,
    config?: SpotifyHttpRequestConfig,
  ): Promise<SpotifyHttpResponse<T>> {
    this.postCalls.push({ url, body, config });
    return Promise.resolve({
      data: { access_token: 'fake-app-token', expires_in: 3600 } as T,
    });
  }

  get<T>(
    url: string,
    config?: SpotifyHttpRequestConfig,
  ): Promise<SpotifyHttpResponse<T>> {
    this.getCalls.push({ url, config });
    if (this.shouldFailNextGetWithNotFound) {
      return Promise.reject(new SpotifyNotFoundError());
    }
    return Promise.resolve({ data: this.nextGetResponse as T });
  }
}

class FakeSpotifyConfig {
  get(): string {
    return 'fake-value';
  }
}

class FakeCacheKeysConfig {
  get(key: 'CACHE_PREFIX' | 'NODE_ENV'): string {
    return key === 'NODE_ENV' ? 'test' : 'tbt';
  }
}

describe('SpotifyClientService', () => {
  function setup() {
    const http = new FakeSpotifyHttpClient();
    const cache = new InMemoryCache();
    const service = new SpotifyClientService(
      http,
      new FakeSpotifyConfig(),
      cache,
      new CacheKeys(new FakeCacheKeysConfig()),
    );
    return { http, service, cache };
  }

  it('busca token de app antes da primeira chamada e reaproveita nas seguintes', async () => {
    const { http, service } = setup();
    http.nextGetResponse = { albums: { items: [], total: 0 } };

    await service.searchAlbums('rock', 10, 0);
    await service.searchAlbums('pop', 10, 0);

    expect(http.postCalls).toHaveLength(1); // token buscado só uma vez
    expect(http.getCalls).toHaveLength(2);
    expect(http.getCalls[0]?.config?.headers?.Authorization).toBe(
      'Bearer fake-app-token',
    );
  });

  it('normaliza resultado de busca', async () => {
    const { http, service } = setup();
    http.nextGetResponse = {
      albums: {
        items: [
          {
            id: 'abc123',
            name: 'The Suffering',
            artists: [{ name: 'Artist A' }],
            images: [{ url: 'https://img/large.jpg' }],
            release_date: '2024-01-01',
          },
        ],
        total: 1,
      },
    };

    const results = await service.searchAlbums('rock', 10, 0);

    expect(results).toEqual({
      items: [
        {
          spotifyId: 'abc123',
          name: 'The Suffering',
          artist: 'Artist A',
          imageUrl: 'https://img/large.jpg',
          imageUrlSmall: 'https://img/large.jpg',
          releaseDate: '2024-01-01',
        },
      ],
      total: 1,
    });
  });

  it('retorna null quando o álbum não existe no Spotify (404)', async () => {
    const { http, service } = setup();
    http.shouldFailNextGetWithNotFound = true;

    const result = await service.getAlbumWithTracks('id-que-nao-existe');

    expect(result).toBeNull();
  });

  it('propaga erros que não são 404', async () => {
    const { http, service } = setup();
    http.get = () => Promise.reject(new Error('falha de rede'));

    await expect(service.getAlbumWithTracks('abc123')).rejects.toThrow(
      'falha de rede',
    );
  });
});
