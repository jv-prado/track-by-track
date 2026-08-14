import { z } from 'zod';

/**
 * Schemas de resposta: existem para o contrato sair completo no OpenAPI e o
 * frontend gerar tipos em vez de escrevê-los à mão (seções 2.2 e 5.1 do
 * CLAUDE.md). São a fonte da verdade do que a API devolve — quem checa que
 * eles não divergiram das interfaces dos serviços é `response-contracts.spec.ts`.
 */
export const paginationMetaSchema = z.object({
  page: z.number(),
  perPage: z.number(),
  total: z.number(),
  totalPages: z.number(),
  /** Só em endpoints com cursor (feed); `null` = fim da lista. */
  nextCursor: z.string().nullish(),
});

export function paginatedSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    data: z.array(item),
    meta: paginationMetaSchema,
  });
}
