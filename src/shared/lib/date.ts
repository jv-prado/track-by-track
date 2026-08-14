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
