import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { paginationQuerySchema } from '../../shared/infrastructure/pagination';
import { CURATED_GENRES } from './genres.constant';

// Paginação padrão (perPage até 100): a lista já veio inteira do Spotify e é
// fatiada em memória, então não há mais o teto de 50 por request da API deles.
// `genre` é vocabulário curado (não o da Apple, usado no chart) porque a fonte
// aqui é a tag de artista do Spotify, já reduzida às 21 categorias.
export const newReleasesQuerySchema = paginationQuerySchema.extend({
  genre: z.enum(CURATED_GENRES).optional(),
});

export class NewReleasesQueryDto extends createZodDto(newReleasesQuerySchema) {}
