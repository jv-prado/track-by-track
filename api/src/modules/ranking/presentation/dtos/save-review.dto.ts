import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const saveReviewSchema = z.object({
  text: z.string().max(2000).optional(),
  favoriteTrackId: z.string().optional(),
  worstTrackId: z.string().optional(),
});

export class SaveReviewDto extends createZodDto(saveReviewSchema) {}
