import { InMemoryCache } from './in-memory-cache.adapter';

describe('InMemoryCache', () => {
  it('devolve hit envelopado e conta hit/miss', async () => {
    const cache = new InMemoryCache();

    expect(await cache.get('ausente')).toBeNull();
    await cache.set('k', { a: 1 }, 60);

    expect(await cache.get<{ a: number }>('k')).toEqual({ value: { a: 1 } });
    expect(cache.stats()).toEqual({ hit: 1, miss: 1, error: 0 });
  });

  it('distingue "não tem" de "tem e vale null" — base do negative cache', async () => {
    const cache = new InMemoryCache();
    await cache.set('ausente-no-spotify', null, 60);

    expect(await cache.get('ausente-no-spotify')).toEqual({ value: null });
  });

  it('expira pelo TTL', async () => {
    jest.useFakeTimers();
    try {
      const cache = new InMemoryCache();
      await cache.set('k', 'v', 1);
      jest.advanceTimersByTime(1_500);

      expect(await cache.get('k')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('getOrSet executa a factory uma vez para requests concorrentes', async () => {
    const cache = new InMemoryCache();
    let calls = 0;
    const factory = () => {
      calls += 1;
      return Promise.resolve('valor');
    };

    const [a, b, c] = await Promise.all([
      cache.getOrSet('k', 60, factory),
      cache.getOrSet('k', 60, factory),
      cache.getOrSet('k', 60, factory),
    ]);

    expect([a, b, c]).toEqual(['valor', 'valor', 'valor']);
    expect(calls).toBe(1);
  });

  it('setIfAbsent só deixa o primeiro passar — é o lock', async () => {
    const cache = new InMemoryCache();

    expect(await cache.setIfAbsent('lock', 1, 10)).toBe(true);
    expect(await cache.setIfAbsent('lock', 1, 10)).toBe(false);
  });

  it('bump incrementa a versão e version parte de zero', async () => {
    const cache = new InMemoryCache();

    expect(await cache.version('ver:x')).toBe(0);
    expect(await cache.bump('ver:x')).toBe(1);
    expect(await cache.bump('ver:x')).toBe(2);
    expect(await cache.version('ver:x')).toBe(2);
  });
});
