import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CURATED_GENRES } from '../../album-catalog/genres.constant';
import { paginationQuerySchema } from '../../../shared/infrastructure/pagination';

export const byUserQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  sort: z.enum(['recent', 'score-desc', 'score-asc']).default('recent'),
  genre: z.enum(CURATED_GENRES).optional(),
});

export class ByUserQueryDto extends createZodDto(byUserQuerySchema) {}
