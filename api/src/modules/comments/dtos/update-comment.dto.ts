import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const updateCommentSchema = z.object({
  text: z.string().min(1).max(2000),
});

export class UpdateCommentDto extends createZodDto(updateCommentSchema) {}
