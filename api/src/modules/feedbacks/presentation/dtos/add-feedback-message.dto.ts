import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const addFeedbackMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'Mensagem é obrigatória.')
    .max(5000, 'Mensagem muito longa (máx. 5000 caracteres).'),
});

export class AddFeedbackMessageDto extends createZodDto(
  addFeedbackMessageSchema,
) {}
