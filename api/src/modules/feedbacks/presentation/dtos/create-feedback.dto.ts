import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createFeedbackSchema = z.object({
  subject: z
    .string()
    .min(1, 'Assunto é obrigatório.')
    .max(120, 'Assunto muito longo (máx. 120 caracteres).'),
  message: z
    .string()
    .min(1, 'Mensagem é obrigatória.')
    .max(5000, 'Mensagem muito longa (máx. 5000 caracteres).'),
});

export class CreateFeedbackDto extends createZodDto(createFeedbackSchema) {}
