import axios, { AxiosInstance } from 'axios';

export const ITUNES_HTTP_CLIENT = Symbol('ItunesHttpClient');

export interface ItunesHttpResponse<T> {
  data: T;
}

export interface ItunesHttpRequestConfig {
  params?: Record<string, string | number>;
}

/** Única superfície que o ItunesPreviewService precisa — permite fake simples nos testes. */
export interface ItunesHttpClient {
  get<T>(
    url: string,
    config?: ItunesHttpRequestConfig,
  ): Promise<ItunesHttpResponse<T>>;
}

export class AxiosItunesHttpClient implements ItunesHttpClient {
  private readonly axios: AxiosInstance = axios.create({ timeout: 8_000 });

  async get<T>(
    url: string,
    config?: ItunesHttpRequestConfig,
  ): Promise<ItunesHttpResponse<T>> {
    return this.axios.get<T>(url, config);
  }
}
