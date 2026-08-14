import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../../../shared/infrastructure/decorators/public.decorator';
import {
  TOKEN_SIGNER,
  type TokenSigner,
} from '../../application/ports/token-signer.port';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(TOKEN_SIGNER) private readonly tokenSigner: TokenSigner,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<Request>();

    if (isPublic) {
      // Rota pública ainda tenta identificar quem chamou: é o que permite a
      // uma resposta pública trazer um pedaço dependente do visitante (ex:
      // `isFollowing` em follow-stats). Token ausente ou inválido segue como
      // anônimo — nunca 401, senão a rota deixaria de ser pública.
      this.tryAttachUser(request);
      return true;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de acesso ausente.');
    }

    const token = authHeader.slice('Bearer '.length);
    const payload = this.tokenSigner.verifyAccessToken(token);
    request.user = payload;
    return true;
  }

  private tryAttachUser(request: Request): void {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return;
    try {
      request.user = this.tokenSigner.verifyAccessToken(
        authHeader.slice('Bearer '.length),
      );
    } catch {
      // Anônimo. Rota pública não pode falhar por causa de token ruim.
    }
  }
}
