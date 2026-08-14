// Porta 1:1 de src/shared/lib/date.ts (web) — Intl.DateTimeFormat funciona
// igual no Hermes (RN), sem polyfill extra nas versões atuais do Expo.
export function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso));
}

/** "Membro desde" — dia exato do cadastro não interessa a ninguém, mês/ano basta. */
export function formatMonthYear(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" }).format(
    new Date(iso),
  );
}
