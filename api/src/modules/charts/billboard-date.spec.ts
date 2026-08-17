import { parseBillboardDate } from './billboard-date';

describe('parseBillboardDate', () => {
  it('interpreta o formato real da fonte como ISO YYYY-MM-DD', () => {
    // confirmado contra o JSON real em produção (17/ago/2026): a fonte manda
    // "2026-08-11" — 11 de agosto, não invertido (ver comentário do módulo).
    const date = parseBillboardDate('2026-08-11');

    expect(date.getUTCFullYear()).toBe(2026);
    expect(date.getUTCMonth()).toBe(7); // agosto = índice 7
    expect(date.getUTCDate()).toBe(11);
  });

  it('rejeita mês fora do intervalo 1-12', () => {
    expect(() => parseBillboardDate('2026-45-13')).toThrow();
  });

  it('rejeita dia que não existe no mês (ex: 30 de fevereiro)', () => {
    expect(() => parseBillboardDate('2026-02-30')).toThrow();
  });

  it('rejeita string em formato completamente diferente', () => {
    expect(() => parseBillboardDate('não-é-data')).toThrow();
    expect(() => parseBillboardDate('2026-08-15T00:00:00Z')).toThrow();
  });
});
