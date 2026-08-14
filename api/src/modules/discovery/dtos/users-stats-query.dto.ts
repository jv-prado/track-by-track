import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/** Teto de ids por chamada: uma página de lista de usuários (perPage máx 100) cabe em 2 chamadas. */
const MAX_USER_IDS = 50;

export const usersStatsQuerySchema = z.object({
  /** CSV — `?userIds=a,b,c`. Uma request por página de lista, não uma por card. */
  userIds: z
    .string()
    .transform((value) =>
      value
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string()).min(1).max(MAX_USER_IDS)),
  /** Mesmo critério de completedOnly em user-stats-query.dto.ts. */
  completedOnly: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export class UsersStatsQueryDto extends createZodDto(usersStatsQuerySchema) {}
