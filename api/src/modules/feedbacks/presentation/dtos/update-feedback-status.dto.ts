import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const updateFeedbackStatusSchema = z.object({
  status: z.enum(['open', 'answered', 'closed']),
});

export class UpdateFeedbackStatusDto extends createZodDto(
  updateFeedbackStatusSchema,
) {}
