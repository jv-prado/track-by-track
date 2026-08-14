import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { paginationQuerySchema } from '../../../shared/infrastructure/pagination';

export const searchUsersQuerySchema = paginationQuerySchema.extend({
  q: z.string().min(1),
});

export class SearchUsersQueryDto extends createZodDto(searchUsersQuerySchema) {}
