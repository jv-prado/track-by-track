import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { paginatedSchema } from '../../../shared/infrastructure/response-schemas';

export const followUserItemSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().optional(),
  followedAt: z.string(),
  /** Cadastro do usuário ("membro desde") — não confundir com `followedAt`. Aditivo (2.3). */
  createdAt: z.string().optional(),
});

export const followStatsSchema = z.object({
  followers: z.number(),
  following: z.number(),
  /** Sempre `false` sem token — a rota é pública. */
  isFollowing: z.boolean(),
});

export const followUsersPageSchema = paginatedSchema(followUserItemSchema);

export const publicUserSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().optional(),
  /** Cadastro do usuário ("membro desde"). Aditivo (2.3). */
  createdAt: z.string().optional(),
});

export const userSearchPageSchema = paginatedSchema(publicUserSchema);

export class FollowStatsDto extends createZodDto(followStatsSchema) {}
export class FollowUsersPageDto extends createZodDto(followUsersPageSchema) {}
export class UserSearchPageDto extends createZodDto(userSearchPageSchema) {}
