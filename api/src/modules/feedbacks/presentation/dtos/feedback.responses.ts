import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { paginatedSchema } from '../../../../shared/infrastructure/response-schemas';

export const feedbackMessageViewSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  adminId: z.string().optional(),
  authorDisplayName: z.string(),
  authorAvatarUrl: z.string().optional(),
  isAdmin: z.boolean(),
  message: z.string(),
  createdAt: z.string(),
});

export const feedbackSummarySchema = z.object({
  id: z.string(),
  userId: z.string(),
  userDisplayName: z.string(),
  userAvatarUrl: z.string().optional(),
  subject: z.string().optional(),
  status: z.enum(['open', 'answered', 'closed']),
  messageCount: z.number(),
  lastMessage: z.string(),
  lastMessageCreatedAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const feedbackDetailSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userDisplayName: z.string(),
  userAvatarUrl: z.string().optional(),
  subject: z.string().optional(),
  status: z.enum(['open', 'answered', 'closed']),
  messages: z.array(feedbackMessageViewSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const feedbacksPageSchema = paginatedSchema(feedbackSummarySchema);

export const unansweredFeedbacksCountSchema = z.object({
  count: z.number(),
});

export class FeedbackMessageViewDto extends createZodDto(
  feedbackMessageViewSchema,
) {}
export class FeedbackSummaryDto extends createZodDto(feedbackSummarySchema) {}
export class FeedbackDetailDto extends createZodDto(feedbackDetailSchema) {}
export class FeedbacksPageDto extends createZodDto(feedbacksPageSchema) {}
export class UnansweredFeedbacksCountDto extends createZodDto(
  unansweredFeedbacksCountSchema,
) {}
