import axios, { AxiosInstance } from 'axios';

export const SPOTIFY_HTTP_CLIENT = Symbol('SpotifyHttpClient');

export interface SpotifyHttpResponse<T> {
  data: T;
}

export interface SpotifyHttpRequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, string | number>;
}

/** Única superfície que o SpotifyClientService precisa — permite fake simples nos testes. */
export interface SpotifyHttpClient {
  post<T>(
    url: string,
    body: unknown,
    config?: SpotifyHttpRequestConfig,
  ): Promise<SpotifyHttpResponse<T>>;
  get<T>(
    url: string,
    config?: SpotifyHttpRequestConfig,
  ): Promise<SpotifyHttpResponse<T>>;
}

export class SpotifyNotFoundError extends Error {
  constructor() {
    super('Recurso não encontrado no Spotify.');
  }
}

/**
 * O Descobrir dispara centenas de buscas numa resolução só (lançamentos em
 * vários mercados, página do chart) e o Spotify responde 429 quando o burst
 * passa da cota. Sem repetir, a chamada limitada vira lista sem gênero ou item
 * descartado do chart — falha silenciosa, não erro visível. `Retry-After` vem
 * em segundos e costuma ser 1-6s.
 */
const RATE_LIMIT_MAX_RETRIES = 3;
const RATE_LIMIT_MAX_WAIT_MS = 10_000;
const RATE_LIMIT_FALLBACK_WAIT_MS = 1_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class AxiosSpotifyHttpClient implements SpotifyHttpClient {
  private readonly axios: AxiosInstance = axios.create({ timeout: 10_000 });

  async post<T>(
    url: string,
    body: unknown,
    config?: SpotifyHttpRequestConfig,
  ): Promise<SpotifyHttpResponse<T>> {
    return this.request(() => this.axios.post<T>(url, body, config));
  }

  async get<T>(
    url: string,
    config?: SpotifyHttpRequestConfig,
  ): Promise<SpotifyHttpResponse<T>> {
    return this.request(() => this.axios.get<T>(url, config));
  }

  private async request<T>(
    fn: () => Promise<SpotifyHttpResponse<T>>,
  ): Promise<SpotifyHttpResponse<T>> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.withNotFoundTranslation(fn);
      } catch (error) {
        const wait = retryAfterMs(error);
        if (wait === null || attempt >= RATE_LIMIT_MAX_RETRIES) throw error;
        await sleep(wait);
      }
    }
  }

  private async withNotFoundTranslation<T>(
    fn: () => Promise<SpotifyHttpResponse<T>>,
  ): Promise<SpotifyHttpResponse<T>> {
    try {
      return await fn();
    } catch (error) {
      // 400 é o que o Spotify responde para id fora do formato base62 — para nós
      // é a mesma coisa que 404 (álbum não existe). Sem isso, `/albums/xpto`
      // virava 500 em vez de 404 e nunca entrava no negative cache.
      const status = axios.isAxiosError(error)
        ? error.response?.status
        : undefined;
      if (status === 404 || status === 400) {
        throw new SpotifyNotFoundError();
      }
      throw error;
    }
  }
}

/** Espera indicada pelo 429, ou `null` quando o erro não é rate limit. */
function retryAfterMs(error: unknown): number | null {
  if (!axios.isAxiosError(error) || error.response?.status !== 429) return null;
  const header = error.response.headers['retry-after'] as string | undefined;
  const seconds = Number(header);
  const wait =
    Number.isFinite(seconds) && seconds > 0
      ? seconds * 1000
      : RATE_LIMIT_FALLBACK_WAIT_MS;
  return Math.min(wait, RATE_LIMIT_MAX_WAIT_MS);
}
