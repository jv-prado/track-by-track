import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { paginationQuerySchema } from '../../../shared/infrastructure/pagination';

export const feedQuerySchema = paginationQuerySchema.extend({
  /** Cursor opaco devolvido em `meta.nextCursor`. Vazio = primeira página. */
  cursor: z.string().min(1).optional(),
});

export class FeedQueryDto extends createZodDto(feedQuerySchema) {}
