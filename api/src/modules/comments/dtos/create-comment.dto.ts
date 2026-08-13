import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createCommentSchema = z.object({
  text: z.string().min(1).max(2000),
});

export class CreateCommentDto extends createZodDto(createCommentSchema) {}
