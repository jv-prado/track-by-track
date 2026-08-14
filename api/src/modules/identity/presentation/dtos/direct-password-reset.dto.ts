import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const directPasswordResetSchema = z.object({
  email: z.string().email(),
  newPassword: z.string().min(8),
});

export class DirectPasswordResetDto extends createZodDto(
  directPasswordResetSchema,
) {}
