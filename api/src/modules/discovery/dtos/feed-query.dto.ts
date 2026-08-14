import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { paginationQuerySchema } from '../../../shared/infrastructure/pagination';

export const feedQuerySchema = paginationQuerySchema.extend({
  /** Cursor opaco devolvido em `meta.nextCursor`. Vazio = primeira página. */
  cursor: z.string().min(1).optional(),
  /**
   * `global` (padrão) = timeline pública. `following` = só de quem o usuário
   * segue, e por isso exige autenticação. Campo aditivo: quem não manda `scope`
   * continua recebendo o feed de sempre (seção 2.3 do CLAUDE.md).
   */
  scope: z.enum(['global', 'following']).default('global'),
  /** Filtra pelo gênero curado do álbum (`albums.curatedGenres`) — mesmo vocabulário do Top Álbuns/Meus Rankings. */
  genre: z.string().min(1).optional(),
});

export class FeedQueryDto extends createZodDto(feedQuerySchema) {}
