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

export class AxiosSpotifyHttpClient implements SpotifyHttpClient {
  private readonly axios: AxiosInstance = axios.create({ timeout: 10_000 });

  async post<T>(
    url: string,
    body: unknown,
    config?: SpotifyHttpRequestConfig,
  ): Promise<SpotifyHttpResponse<T>> {
    return this.withNotFoundTranslation(() =>
      this.axios.post<T>(url, body, config),
    );
  }

  async get<T>(
    url: string,
    config?: SpotifyHttpRequestConfig,
  ): Promise<SpotifyHttpResponse<T>> {
    return this.withNotFoundTranslation(() => this.axios.get<T>(url, config));
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
