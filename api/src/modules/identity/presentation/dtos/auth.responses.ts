import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const currentUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().optional(),
  mustResetPassword: z.boolean(),
  createdAt: z.string(),
  role: z.enum(['user', 'admin']),
});

export const authUserSummarySchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().optional(),
  role: z.enum(['user', 'admin']),
});

/**
 * `refreshToken` só vem preenchido quando a request chega com header
 * `X-Client: mobile` (ver AuthController.isMobileClient) — web nunca recebe
 * esse campo, continua só no cookie httpOnly (não expor refresh token a JS de
 * página é o motivo do cookie existir). Mobile não tem cookie jar de browser,
 * então precisa do valor no corpo pra guardar em secure storage.
 */
export const loginResponseSchema = z.object({
  accessToken: z.string(),
  user: authUserSummarySchema,
  refreshToken: z.string().optional(),
});

/** Refresh não reenvia o usuário: o token novo basta pro cliente seguir. */
export const refreshResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
});

export const registerResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  createdAt: z.string(),
});

/** Perfil sem `mustResetPassword`/`createdAt` — é o retorno das mutações de perfil. */
export const profileResponseSchema = authUserSummarySchema;

/** Resposta genérica de fluxo sem recurso (logout, reset de senha). */
export const messageResponseSchema = z.object({
  message: z.string(),
});

export class CurrentUserResponseDto extends createZodDto(currentUserSchema) {}
export class LoginResponseDto extends createZodDto(loginResponseSchema) {}
export class RefreshResponseDto extends createZodDto(refreshResponseSchema) {}
export class RegisterResponseDto extends createZodDto(registerResponseSchema) {}
export class ProfileResponseDto extends createZodDto(profileResponseSchema) {}
export class MessageResponseDto extends createZodDto(messageResponseSchema) {}
