import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const userStatsQuerySchema = z.object({
  /** Mesmo critério de completedOnly em by-user-query.dto.ts. */
  completedOnly: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export class UserStatsQueryDto extends createZodDto(userStatsQuerySchema) {}
