import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { paginatedSchema } from '../../../shared/infrastructure/response-schemas';

export const billboardChartAlbumSchema = z.object({
  /** `null` quando o item não foi resolvido pro catálogo — mostrado mesmo assim. */
  albumId: z.string().nullable(),
  albumName: z.string(),
  albumArtist: z.string(),
  albumImageUrl: z.string().nullable().optional(),
  rank: z.number(),
  lastWeekRank: z.number().optional(),
  peakRank: z.number().optional(),
  weeksOnChart: z.number().optional(),
  chartDate: z.string(),
  status: z.enum(['resolved', 'unresolved']),
  /** `null` enquanto ninguém do TBT avaliou o álbum ainda, ou quando `status` é `unresolved`. */
  tbtScore: z.number().nullable(),
  ratingsCount: z.number(),
});

export const billboardHistoryEntrySchema = z.object({
  chartDate: z.string(),
  rank: z.number(),
});

export const billboardHistorySchema = z.object({
  albumId: z.string(),
  currentRank: z.number().nullable(),
  lastWeekRank: z.number().nullable(),
  peakRank: z.number().nullable(),
  weeksOnChart: z.number().nullable(),
  history: z.array(billboardHistoryEntrySchema),
});

export const billboardChartPageSchema = paginatedSchema(
  billboardChartAlbumSchema,
);

export class BillboardChartPageDto extends createZodDto(
  billboardChartPageSchema,
) {}
export class BillboardHistoryDto extends createZodDto(billboardHistorySchema) {}
