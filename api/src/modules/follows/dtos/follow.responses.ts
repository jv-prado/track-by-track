import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { paginatedSchema } from '../../../shared/infrastructure/response-schemas';

export const followUserItemSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().optional(),
  followedAt: z.string(),
});

export const followStatsSchema = z.object({
  followers: z.number(),
  following: z.number(),
  /** Sempre `false` sem token — a rota é pública. */
  isFollowing: z.boolean(),
});

export const followUsersPageSchema = paginatedSchema(followUserItemSchema);

export class FollowStatsDto extends createZodDto(followStatsSchema) {}
export class FollowUsersPageDto extends createZodDto(followUsersPageSchema) {}
