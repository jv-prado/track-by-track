const UNIT_TO_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/** Converte strings como "15m"/"7d" (mesmo formato aceito pelo jsonwebtoken) em milissegundos. */
export function parseDurationToMs(duration: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(duration.trim());
  if (!match) {
    throw new Error(
      `Duração inválida: "${duration}". Use o formato "15m", "7d", etc.`,
    );
  }
  const [, amount, unit] = match;
  return Number(amount) * UNIT_TO_MS[unit as keyof typeof UNIT_TO_MS]!;
}
