import axios, { AxiosInstance, isAxiosError } from 'axios';

export const BILLBOARD_HTTP_CLIENT = Symbol('BillboardHttpClient');

export interface BillboardHttpResponse<T> {
  data: T;
}

/** Única superfície que o BillboardSourceService precisa — permite fake simples nos testes. */
export interface BillboardHttpClient {
  get<T>(url: string): Promise<BillboardHttpResponse<T>>;
}

/**
 * `raw.githubusercontent.com` rate-limita IP anônimo sob rajada e às vezes
 * demora a responder — os dois confirmados na prática (429 real e timeout
 * real durante o desenvolvimento desta integração), não hipotético. Spec §22
 * pede exatamente isto: timeout, retry controlado, respeitando `Retry-After`
 * quando vem, backoff exponencial como fallback. Mesmo padrão de
 * `scripts/backfill-missing-albums.ts` (`isRateLimited`/`retryAfterMs`),
 * replicado aqui porque aquele é específico do Spotify.
 */
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RETRIES = 4;
const BASE_BACKOFF_MS = 1_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  // Sem `response` = a request não completou (timeout, DNS, conexão caiu) —
  // confirmado na prática: `ECONNABORTED` de timeout em rede mais lenta, não
  // hipotético. GET idempotente numa fonte estática, retry é seguro.
  if (!error.response) return true;
  const status = error.response.status;
  // 429 (rate limit) e 5xx (instabilidade momentânea do CDN) valem retry;
  // 404/erro de parsing do lado de cá, não.
  return status === 429 || status >= 500;
}

function retryAfterHeader(headers: unknown): string | undefined {
  if (!headers || typeof headers !== 'object' || !('retry-after' in headers)) {
    return undefined;
  }
  const value = (headers as { 'retry-after'?: unknown })['retry-after'];
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : undefined;
}

function retryDelayMs(error: unknown, attempt: number): number {
  if (isAxiosError(error)) {
    const header = retryAfterHeader(error.response?.headers);
    const seconds = header ? Number(header) : NaN;
    if (Number.isFinite(seconds)) return seconds * 1_000;
  }
  return BASE_BACKOFF_MS * 2 ** attempt;
}

export class AxiosBillboardHttpClient implements BillboardHttpClient {
  private readonly axios: AxiosInstance = axios.create({
    timeout: REQUEST_TIMEOUT_MS,
  });

  get<T>(url: string): Promise<BillboardHttpResponse<T>> {
    return this.getWithRetry<T>(url, 0);
  }

  private async getWithRetry<T>(
    url: string,
    attempt: number,
  ): Promise<BillboardHttpResponse<T>> {
    try {
      return await this.axios.get<T>(url);
    } catch (error) {
      if (attempt >= MAX_RETRIES || !isRetryable(error)) throw error;
      await sleep(retryDelayMs(error, attempt));
      return this.getWithRetry<T>(url, attempt + 1);
    }
  }
}
