import { createZodDto } from 'nestjs-zod';
import { paginationQuerySchema } from '../../../shared/infrastructure/pagination';

export class ListNotificationsQueryDto extends createZodDto(
  paginationQuerySchema,
) {}
