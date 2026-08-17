/**
 * A spec original do projeto alegava que a fonte (billboard-json) manda
 * `"date": "YYYY-DD-MM"` invertido. Checado contra o JSON real em produção
 * (17/ago/2026): a fonte manda `"2026-08-11"` — **ISO padrão, YYYY-MM-DD**,
 * dia e mês não invertidos. A alegação original estava errada (ou valia pra
 * uma versão antiga da fonte); o parser segue o formato real observado, não
 * o documentado. Mantido como função isolada mesmo assim: se a fonte trocar
 * de formato de novo, o ponto de ajuste é um só.
 */
const BILLBOARD_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseBillboardDate(raw: string): Date {
  const match = BILLBOARD_DATE_PATTERN.exec(raw);
  if (!match) {
    throw new Error(`Data do Billboard em formato inesperado: "${raw}"`);
  }

  const [, yearStr, monthStr, dayStr] = match;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Data do Billboard fora do intervalo esperado: "${raw}"`);
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  // `Date.UTC` rola dia inválido pro mês seguinte em vez de falhar (ex: 30 de
  // fevereiro vira 2 de março) — confere se o dia/mês sobreviveram intactos.
  if (date.getUTCDate() !== day || date.getUTCMonth() !== month - 1) {
    throw new Error(`Data do Billboard inválida: "${raw}"`);
  }

  return date;
}
