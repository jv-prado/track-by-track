import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { paginatedSchema } from '../../../shared/infrastructure/response-schemas';
import { CURATED_GENRES } from '../genres.constant';

export const albumSummarySchema = z.object({
  spotifyId: z.string(),
  name: z.string(),
  artist: z.string(),
  /** 640px — só onde a capa aparece grande. */
  imageUrl: z.string().optional(),
  /** 300px — o que os grids devem consumir. */
  imageUrlSmall: z.string().optional(),
  releaseDate: z.string().optional(),
});

export const albumTrackSchema = z.object({
  spotifyId: z.string(),
  name: z.string(),
  durationMs: z.number(),
  trackNumber: z.number(),
  /** Prévia de 30s da Spotify — nem toda faixa tem. */
  previewUrl: z.string().optional(),
});

export const albumDetailSchema = albumSummarySchema.extend({
  tracks: z.array(albumTrackSchema),
  /** Gêneros dos artistas — Spotify não expõe gênero no álbum, só no artista. */
  genres: z.array(z.string()).optional(),
});

/** Lançamento recente com o gênero já reduzido às categorias curadas. */
export const newReleaseAlbumSchema = albumSummarySchema.extend({
  genres: z.array(z.enum(CURATED_GENRES)),
});

/** Item do chart da Apple, já resolvido pro spotifyId equivalente. */
export const chartAlbumSchema = z.object({
  spotifyId: z.string(),
  /** Posição no chart cheio da Apple (união das lojas) — não muda com filtro de gênero. */
  rank: z.number(),
  name: z.string(),
  artist: z.string(),
  imageUrl: z.string().optional(),
  releaseDate: z.string().optional(),
  /** Vocabulário da Apple (ex: "Hip-Hop/Rap") — diferente de `/albums/genres`. */
  genres: z.array(z.string()),
});

export const trackPreviewSchema = z.object({
  previewUrl: z.string().nullable(),
});

export const albumSearchPageSchema = paginatedSchema(albumSummarySchema);
export const newReleasesPageSchema = paginatedSchema(newReleaseAlbumSchema);
export const topChartPageSchema = paginatedSchema(chartAlbumSchema);
export const genreListSchema = z.array(z.string());

export class AlbumSearchPageDto extends createZodDto(albumSearchPageSchema) {}
export class AlbumDetailDto extends createZodDto(albumDetailSchema) {}
export class NewReleasesPageDto extends createZodDto(newReleasesPageSchema) {}
export class TopChartPageDto extends createZodDto(topChartPageSchema) {}
export class TrackPreviewDto extends createZodDto(trackPreviewSchema) {}
