import { createZodDto } from 'nestjs-zod';
import { paginationQuerySchema } from '../../shared/infrastructure/pagination';

export class BillboardChartQueryDto extends createZodDto(
  paginationQuerySchema,
) {}
