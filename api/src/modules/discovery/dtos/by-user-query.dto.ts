import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CURATED_GENRES } from '../../album-catalog/genres.constant';
import { paginationQuerySchema } from '../../../shared/infrastructure/pagination';

export const byUserQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  sort: z.enum(['recent', 'score-desc', 'score-asc']).default('recent'),
  genre: z.enum(CURATED_GENRES).optional(),
  /**
   * `true` no perfil público (só álbum 100% avaliado, mesmo critério do feed
   * global — `completedAt`). "Meus rankings" manda `false`/omite pra continuar
   * mostrando rascunho em progresso com a barra de progresso.
   */
  completedOnly: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export class ByUserQueryDto extends createZodDto(byUserQuerySchema) {}
