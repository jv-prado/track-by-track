import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/infrastructure/pagination';

export const topChartQuerySchema = paginationQuerySchema.extend({
  // Gênero vem do próprio chart da Apple (ver apple-top-albums.service.ts),
  // não da lista curada do Spotify — vocabulário diferente, texto livre aqui.
  genre: z.string().min(1).optional(),
});

export class TopChartQueryDto extends createZodDto(topChartQuerySchema) {}
