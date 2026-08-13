import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  /**
   * Cursor opaco da próxima página. Só vem em endpoints que suportam cursor
   * (feed); `null` significa fim da lista. Campo aditivo — quem paginava por
   * `page` continua funcionando (seção 2.3 do CLAUDE.md).
   */
  nextCursor?: string | null;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export function buildPaginationMeta(
  page: number,
  perPage: number,
  total: number,
): PaginationMeta {
  return {
    page,
    perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export function paginationSkip(page: number, perPage: number): number {
  return (page - 1) * perPage;
}
