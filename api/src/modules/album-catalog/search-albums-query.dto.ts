import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const searchAlbumsQuerySchema = z.object({
  q: z.string().min(1),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(50).default(20),
});

export class SearchAlbumsQueryDto extends createZodDto(
  searchAlbumsQuerySchema,
) {}
