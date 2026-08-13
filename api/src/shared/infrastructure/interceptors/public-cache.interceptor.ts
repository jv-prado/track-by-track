import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { Observable, map } from 'rxjs';

export const PUBLIC_CACHE_MAX_AGE = 'public-cache:max-age';

/**
 * Marca a rota como cacheável pelo browser/CDN. Complementa o cache do servidor:
 * este corta a request inteira, aquele corta só a query.
 *
 * `stale-while-revalidate` deixa o browser exibir o valor velho e revalidar em
 * background — resposta instantânea sem servir dado eterno.
 */
export const PublicCache = (maxAgeSeconds: number) =>
  SetMetadata(PUBLIC_CACHE_MAX_AGE, maxAgeSeconds);

@Injectable()
export class PublicCacheInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const maxAge = this.reflector.get<number | undefined>(
      PUBLIC_CACHE_MAX_AGE,
      context.getHandler(),
    );
    if (maxAge === undefined) return next.handle();

    const response = context.switchToHttp().getResponse<Response>();
    return next.handle().pipe(
      map((body: unknown) => {
        response.setHeader(
          'Cache-Control',
          `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
        );
        return body;
      }),
    );
  }
}
