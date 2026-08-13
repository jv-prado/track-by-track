import { createZodDto } from 'nestjs-zod';
import { paginationQuerySchema } from '../../../shared/infrastructure/pagination';

export class ListCommentsQueryDto extends createZodDto(paginationQuerySchema) {}
