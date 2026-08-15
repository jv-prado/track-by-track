/**
 * Formata data ISO 8601 pro locale ativo. Web formata na exibição — nunca no
 * store (ver CLAUDE.md seção 3).
 */
export function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso));
}

/** "Membro desde" — dia exato do cadastro não interessa a ninguém, mês/ano basta. */
export function formatMonthYear(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" }).format(
    new Date(iso),
  );
}

/** Chave de agrupamento por dia local do usuário — dois ISO no mesmo dia viram a mesma chave. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Cabeçalho de dia do diário: dia grande + mês curto (rail), ano só quando não é o ano corrente. */
export function formatDiaryDay(
  iso: string,
  locale: string,
): { day: string; month: string; year: string | null } {
  const date = new Date(iso);
  const currentYear = new Date().getFullYear();
  return {
    day: new Intl.DateTimeFormat(locale, { day: "2-digit" }).format(date),
    month: new Intl.DateTimeFormat(locale, { month: "short" }).format(date).replace(".", ""),
    year: date.getFullYear() === currentYear ? null : String(date.getFullYear()),
  };
}
