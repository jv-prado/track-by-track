import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// null = limpa o campo explicitamente; ausente/undefined = não mexe (ver SaveReviewUseCase).
export const saveReviewSchema = z.object({
  text: z.string().max(2000).nullable().optional(),
  favoriteTrackId: z.string().nullable().optional(),
  worstTrackId: z.string().nullable().optional(),
});

export class SaveReviewDto extends createZodDto(saveReviewSchema) {}
