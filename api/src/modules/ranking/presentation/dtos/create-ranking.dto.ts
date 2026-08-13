import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createRankingSchema = z.object({
  albumId: z.string().min(1),
});

export class CreateRankingDto extends createZodDto(createRankingSchema) {}
