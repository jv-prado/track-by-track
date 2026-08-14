import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Web nunca preenche `refreshToken` no corpo — o token vem do cookie httpOnly
 * (ver AuthController.refresh). Mobile não tem cookie jar, manda o token que
 * guardou em secure storage aqui.
 *
 * `.default({})`: web chama /auth/refresh e /auth/logout SEM corpo nenhum
 * (nem Content-Type) — sem isso, `req.body` chega `undefined` no Zod, que
 * rejeita objeto ausente mesmo com o campo opcional (422 em vez de 200).
 */
export const refreshSchema = z
  .object({
    refreshToken: z.string().optional(),
  })
  .default({});

export class RefreshDto extends createZodDto(refreshSchema) {}
