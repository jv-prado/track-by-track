import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marca uma rota como isenta do JwtAuthGuard global (ver seção 4.4 do CLAUDE.md). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
