import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI é obrigatório'),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET precisa ter 32+ caracteres'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  WEB_ORIGIN: z.string().url(),
  SPOTIFY_CLIENT_ID: z.string().min(1, 'SPOTIFY_CLIENT_ID é obrigatório'),
  SPOTIFY_CLIENT_SECRET: z
    .string()
    .min(1, 'SPOTIFY_CLIENT_SECRET é obrigatório'),
  EMAIL_SENDER_ADAPTER: z.enum(['console']).default('console'),
  CLOUDINARY_CLOUD_NAME: z
    .string()
    .min(1, 'CLOUDINARY_CLOUD_NAME é obrigatório'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY é obrigatório'),
  CLOUDINARY_API_SECRET: z
    .string()
    .min(1, 'CLOUDINARY_API_SECRET é obrigatório'),
  // memory: cache em processo (default, suficiente com 1 instância)
  // redis: compartilhado entre instâncias · off: todo get é miss
  CACHE_DRIVER: z.enum(['memory', 'redis', 'off']).default('memory'),
  REDIS_URL: z.string().url().optional(),
  CACHE_PREFIX: z.string().min(1).default('tbt'),
});

/** CACHE_DRIVER=redis sem REDIS_URL é crash no boot, não fallback silencioso. */
export const envSchemaWithRules = envSchema.superRefine((env, ctx) => {
  if (env.CACHE_DRIVER === 'redis' && !env.REDIS_URL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['REDIS_URL'],
      message: 'REDIS_URL é obrigatório quando CACHE_DRIVER=redis',
    });
  }
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(rawEnv: NodeJS.ProcessEnv): Env {
  const result = envSchemaWithRules.safeParse(rawEnv);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    console.error(`Variáveis de ambiente inválidas ou faltando:\n${issues}`);
    process.exit(1);
  }
  return result.data;
}
