import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { paginatedSchema } from '../../../shared/infrastructure/response-schemas';

export const feedItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userDisplayName: z.string(),
  userAvatarUrl: z.string().optional(),
  albumId: z.string(),
  albumName: z.string(),
  albumArtist: z.string(),
  albumImageUrl: z.string().optional(),
  averageScore: z.number(),
  ratedTracks: z.number(),
  totalTracks: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  /** `null` fora da janela de 24h (ver FEED_BADGE_WINDOW_MS em discovery.service.ts). */
  badge: z.enum(['new', 'updated']).nullable(),
});

export const userStatsSchema = z.object({
  total: z.number(),
  averageScore: z.number(),
  tracksRated: z.number(),
});

export const topAlbumItemSchema = z.object({
  albumId: z.string(),
  albumName: z.string(),
  albumArtist: z.string(),
  albumImageUrl: z.string().optional(),
  averageScore: z.number(),
  ratingsCount: z.number(),
});

export const lastEditedAlbumSchema = z.object({
  albumId: z.string(),
  albumName: z.string(),
  albumArtist: z.string(),
  albumImageUrl: z.string().optional(),
  averageScore: z.number(),
  progress: z.object({
    rated: z.number(),
    total: z.number(),
    percentage: z.number(),
  }),
  updatedAt: z.string(),
});

export const albumReviewItemSchema = z.object({
  rankingId: z.string(),
  userId: z.string(),
  userDisplayName: z.string(),
  userAvatarUrl: z.string().optional(),
  reviewText: z.string().nullable(),
  averageScore: z.number(),
  createdAt: z.string(),
});

export const trackTallyViewSchema = z.object({
  trackId: z.string(),
  trackName: z.string(),
  percentage: z.number(),
});

export const albumStatsSchema = z.object({
  albumId: z.string(),
  averageScore: z.number(),
  ratingsCount: z.number(),
  topFavoriteTracks: z.array(trackTallyViewSchema),
  topWorstTracks: z.array(trackTallyViewSchema),
});

export const feedPageSchema = paginatedSchema(feedItemSchema);
export const topAlbumsPageSchema = paginatedSchema(topAlbumItemSchema);
export const albumReviewsPageSchema = paginatedSchema(albumReviewItemSchema);

export class FeedPageDto extends createZodDto(feedPageSchema) {}
export class UserStatsDto extends createZodDto(userStatsSchema) {}
export class TopAlbumsPageDto extends createZodDto(topAlbumsPageSchema) {}
export class AlbumReviewsPageDto extends createZodDto(albumReviewsPageSchema) {}
export class AlbumStatsDto extends createZodDto(albumStatsSchema) {}
/** `null` quando o usuário ainda não editou nenhum álbum. */
export class LastEditedAlbumDto extends createZodDto(lastEditedAlbumSchema) {}
