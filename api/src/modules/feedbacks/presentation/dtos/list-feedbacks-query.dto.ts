import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { paginationQuerySchema } from '../../../../shared/infrastructure/pagination';

export const listFeedbacksQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['open', 'answered', 'closed']).optional(),
});

export class ListFeedbacksQueryDto extends createZodDto(
  listFeedbacksQuerySchema,
) {}
