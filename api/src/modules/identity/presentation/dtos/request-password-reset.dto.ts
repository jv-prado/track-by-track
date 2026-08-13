import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const requestPasswordResetSchema = z.object({
  email: z.string().email(),
});

export class RequestPasswordResetDto extends createZodDto(
  requestPasswordResetSchema,
) {}
