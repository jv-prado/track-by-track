import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CURATED_GENRES } from '../../album-catalog/genres.constant';
import { paginationQuerySchema } from '../../../shared/infrastructure/pagination';

export const topAlbumsQuerySchema = paginationQuerySchema.extend({
  genre: z.enum(CURATED_GENRES).optional(),
});

export class TopAlbumsQueryDto extends createZodDto(topAlbumsQuerySchema) {}
