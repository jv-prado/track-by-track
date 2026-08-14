import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const currentUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().optional(),
  mustResetPassword: z.boolean(),
  createdAt: z.string(),
});

export const authUserSummarySchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().optional(),
});

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  user: authUserSummarySchema,
});

/** Refresh não reenvia o usuário: o token novo basta pro cliente seguir. */
export const refreshResponseSchema = z.object({
  accessToken: z.string(),
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
