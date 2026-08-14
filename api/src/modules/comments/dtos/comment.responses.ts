import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { paginatedSchema } from '../../../shared/infrastructure/response-schemas';

export const commentViewSchema = z.object({
  id: z.string(),
  rankingId: z.string(),
  authorId: z.string(),
  authorDisplayName: z.string(),
  authorAvatarUrl: z.string().optional(),
  text: z.string(),
  createdAt: z.string(),
  /** `null` enquanto o comentário não foi editado. */
  editedAt: z.string().nullable(),
});

export const commentsPageSchema = paginatedSchema(commentViewSchema);

export class CommentViewDto extends createZodDto(commentViewSchema) {}
export class CommentsPageDto extends createZodDto(commentsPageSchema) {}
