import { z } from "zod";

/**
 * Porta do padrão de src/app/env.ts (web) — Zod valida no boot, crash com
 * mensagem clara em vez de `undefined` vazando pro runtime (mesma regra da
 * seção 7 do CLAUDE.md). `EXPO_PUBLIC_*` é inlined em build time pelo Expo,
 * lido de `process.env` normalmente (não precisa de lib extra).
 */
const envSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url(),
});

const result = envSchema.safeParse({
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
});

if (!result.success) {
  const issues = result.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Variáveis de ambiente inválidas ou faltando:\n${issues}`);
}

export const env = result.data;
