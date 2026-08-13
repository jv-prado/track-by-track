import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const rateTrackSchema = z.object({
  score: z.number().min(0).max(5).multipleOf(0.5),
});

export class RateTrackDto extends createZodDto(rateTrackSchema) {}
