const DEFAULTS: Record<string, string> = {
  JWT_REFRESH_TTL: '7d',
  WEB_ORIGIN: 'http://localhost:5173',
  NODE_ENV: 'test',
};

/** Substitui AppConfigService nos testes unitários — só implementa o método `get` usado. */
export class FakeConfigService {
  get(key: string): string {
    return DEFAULTS[key] ?? '';
  }
}
