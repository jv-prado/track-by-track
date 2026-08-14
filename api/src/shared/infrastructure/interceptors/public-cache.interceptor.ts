import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
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

    const request = context.switchToHttp().getRequest<Request>();
    // Dono do próprio dado (ex: "Minhas Avaliações" logo após avaliar uma faixa)
    // não pode cachear no browser: a invalidação do TanStack Query dispara um
    // novo fetch, mas com Cache-Control o browser responderia do próprio cache
    // sem nem bater no servidor — a invalidação de servidor vira letra morta.
    if (this.dependsOnCaller(request)) return next.handle();

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

  /**
   * Resposta que muda conforme quem pergunta nunca pode virar `Cache-Control:
   * public` — um proxy compartilhado serviria o feed pessoal de um usuário para
   * outro. Mas o mesmo vale quando quem pergunta é quem acabou de mudar o dado:
   * `/discovery/albums/:albumId/stats` e `/reviews` não têm `:userId` na rota
   * (a resposta é a mesma pra qualquer visitante), só que o próprio usuário logado
   * pode ser um dos rankings contados ali. Sem essa checagem, avaliar/desavaliar
   * uma faixa invalida o cache do servidor (correto), o TanStack Query dispara o
   * refetch (correto), mas o browser responde do próprio HTTP cache por até
   * `max-age + stale-while-revalidate` sem nem bater no servidor — a invalidação
   * de servidor vira letra morta pros próprios olhos de quem votou.
   *
   * Decodifica o JWT sem verificar assinatura — é heurística de cache, não
   * decisão de acesso (o endpoint já é `@Public()`; o pior caso de um `sub`
   * forjado é só perder um cache válido).
   */
  private dependsOnCaller(request: Request): boolean {
    // Feed pessoal (`?scope=following`) é sempre por usuário, mesmo sem `:userId` na rota.
    if (request.query?.scope === 'following') return true;

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return false;

    const userIdParam = request.params?.userId;
    // Rota sem `:userId` (feed, top-albums, album stats/reviews): a resposta é
    // pública, mas quem está logado pode ter acabado de contribuir pra ela —
    // não arrisca, não cacheia no browser desse request autenticado.
    if (!userIdParam) return true;

    try {
      const payloadSegment = authHeader.slice('Bearer '.length).split('.')[1];
      if (!payloadSegment) return false;
      const payload = JSON.parse(
        Buffer.from(payloadSegment, 'base64url').toString('utf8'),
      ) as { sub?: string };
      return payload.sub === userIdParam;
    } catch {
      return false;
    }
  }
}
