import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const rankingEntryViewSchema = z.object({
  trackId: z.string(),
  score: z.number(),
  position: z.number(),
  ignored: z.boolean(),
});

export const rankingViewSchema = z.object({
  id: z.string(),
  userId: z.string(),
  albumId: z.string(),
  entries: z.array(rankingEntryViewSchema),
  /** 0-10, sempre recalculado no servidor — nunca aceito do cliente. */
  averageScore: z.number(),
  progress: z.object({
    rated: z.number(),
    total: z.number(),
    ignored: z.number(),
    percentage: z.number(),
  }),
  review: z.object({
    text: z.string().optional(),
    favoriteTrackId: z.string().optional(),
    worstTrackId: z.string().optional(),
  }),
  isFirstCompletionBadgeActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export class RankingViewDto extends createZodDto(rankingViewSchema) {}
