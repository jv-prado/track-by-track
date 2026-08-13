import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { paginationQuerySchema } from '../../../shared/infrastructure/pagination';

export const byUserQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  sort: z.enum(['recent', 'score-desc', 'score-asc']).default('recent'),
});

export class ByUserQueryDto extends createZodDto(byUserQuerySchema) {}
