import { ItunesPreviewService } from './itunes-preview.service';
import type {
  ItunesHttpClient,
  ItunesHttpRequestConfig,
  ItunesHttpResponse,
} from './itunes-http-client';

class FakeItunesHttpClient implements ItunesHttpClient {
  getCalls: { url: string; config?: ItunesHttpRequestConfig }[] = [];
  /** term (minúsculo) -> resposta simulada da busca por faixa. */
  responsesByTerm = new Map<string, unknown>();
  /** número de vezes que a próxima chamada deve rejeitar com 403 antes de responder. */
  rejectWith403Times = 0;
  shouldFail = false;

  get<T>(
    url: string,
    config?: ItunesHttpRequestConfig,
  ): Promise<ItunesHttpResponse<T>> {
    this.getCalls.push({ url, config });
    if (this.rejectWith403Times > 0) {
      this.rejectWith403Times -= 1;
      const error = new Error('rate limited') as Error & {
        isAxiosError: boolean;
        response: { status: number };
      };
      error.isAxiosError = true;
      error.response = { status: 403 };
      return Promise.reject(error);
    }
    if (this.shouldFail) return Promise.reject(new Error('falha de rede'));
    const term = String(config?.params?.term ?? '').toLowerCase();
    const data = this.responsesByTerm.get(term) ?? { results: [] };
    return Promise.resolve({ data: data as T });
  }
}

describe('ItunesPreviewService', () => {
  function setup() {
    const http = new FakeItunesHttpClient();
    const service = new ItunesPreviewService(http);
    return { http, service };
  }

  it('casa pelo nome exato, ignorando versões alternativas', async () => {
    const { http, service } = setup();
    http.responsesByTerm.set("guns n' roses welcome to the jungle", {
      results: [
        {
          wrapperType: 'track',
          kind: 'song',
          artistName: "Guns N' Roses",
          trackName: 'Welcome To The Jungle (Live)',
          previewUrl: 'https://preview/live.m4a',
        },
        {
          wrapperType: 'track',
          kind: 'song',
          artistName: "Guns N' Roses",
          trackName: 'Welcome To The Jungle',
          previewUrl: 'https://preview/studio.m4a',
        },
      ],
    });

    const previewUrl = await service.fetchPreview(
      "Guns N' Roses",
      'Welcome To The Jungle',
    );

    expect(previewUrl).toBe('https://preview/studio.m4a');
  });

  it('sem faixa correspondente, devolve undefined', async () => {
    const { service } = setup();

    const previewUrl = await service.fetchPreview(
      'Artista X',
      'Faixa Inexistente',
    );

    expect(previewUrl).toBeUndefined();
  });

  it('403 (rate limit) tenta de novo uma vez e aí funciona', async () => {
    const { http, service } = setup();
    http.rejectWith403Times = 1;
    http.responsesByTerm.set('artista y faixa boa', {
      results: [
        {
          wrapperType: 'track',
          kind: 'song',
          artistName: 'Artista Y',
          trackName: 'Faixa Boa',
          previewUrl: 'https://preview/boa.m4a',
        },
      ],
    });

    const previewUrl = await service.fetchPreview('Artista Y', 'Faixa Boa');

    expect(previewUrl).toBe('https://preview/boa.m4a');
    expect(http.getCalls).toHaveLength(2); // 1ª tomou 403, 2ª (retry) achou
  });

  it('iTunes fora do ar não derruba a chamada, só devolve undefined', async () => {
    const { http, service } = setup();
    http.shouldFail = true;

    const previewUrl = await service.fetchPreview(
      "Guns N' Roses",
      'Welcome To The Jungle',
    );

    expect(previewUrl).toBeUndefined();
  });
});
