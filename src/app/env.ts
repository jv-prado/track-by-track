import { z } from "zod";

const envSchema = z.object({
  VITE_API_URL: z.string().url(),
});

const result = envSchema.safeParse(import.meta.env);
if (!result.success) {
  const issues = result.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`).join("\n");
  throw new Error(`Variáveis de ambiente inválidas ou faltando:\n${issues}`);
}

export const env = result.data;
