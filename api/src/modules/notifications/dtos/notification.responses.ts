import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { paginatedSchema } from '../../../shared/infrastructure/response-schemas';
import { NOTIFICATION_TYPES } from '../notification.schema';

export const notificationViewSchema = z.object({
  id: z.string(),
  type: z.enum(NOTIFICATION_TYPES),
  actorId: z.string(),
  actorDisplayName: z.string(),
  actorAvatarUrl: z.string().optional(),
  /** Só em `comment` — destino do clique. */
  rankingId: z.string().optional(),
  albumId: z.string().optional(),
  read: z.boolean(),
  createdAt: z.string(),
});

export const notificationsPageSchema = paginatedSchema(notificationViewSchema);

export const unreadCountSchema = z.object({ count: z.number() });

export class NotificationsPageDto extends createZodDto(
  notificationsPageSchema,
) {}
export class UnreadCountDto extends createZodDto(unreadCountSchema) {}
