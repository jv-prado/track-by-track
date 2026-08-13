import { RedisCache } from './redis-cache.adapter';

/** Porta fechada de propósito: simula Redis fora do ar sem subir container. */
const DEAD_REDIS = 'redis://127.0.0.1:6399';

describe('RedisCache com Redis indisponível', () => {
  let cache: RedisCache;

  beforeEach(() => {
    cache = new RedisCache(DEAD_REDIS);
  });

  afterEach(async () => {
    await cache.onModuleDestroy();
  });

  it('get devolve miss em vez de estourar', async () => {
    await expect(cache.get('qualquer')).resolves.toBeNull();
    expect(cache.stats().error).toBeGreaterThan(0);
  });

  it('set, del e bump não estouram', async () => {
    await expect(cache.set('k', { a: 1 }, 60)).resolves.toBeUndefined();
    await expect(cache.del('k')).resolves.toBeUndefined();
    await expect(cache.bump('ver:x')).resolves.toBe(0);
    await expect(cache.version('ver:x')).resolves.toBe(0);
  });

  it('setIfAbsent devolve false — ninguém ganha lock, todos seguem pelo caminho lento', async () => {
    await expect(cache.setIfAbsent('lock', 1, 10)).resolves.toBe(false);
  });

  it('getOrSet ainda entrega o valor da fonte (Mongo) com cache morto', async () => {
    const value = await cache.getOrSet('k', 60, () =>
      Promise.resolve('valor-do-mongo'),
    );

    expect(value).toBe('valor-do-mongo');
  });

  it('healthy() reporta down — sem reprovar a request', async () => {
    await expect(cache.healthy()).resolves.toBe(false);
  });
});
