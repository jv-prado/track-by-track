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
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de acesso ausente.');
    }

    const token = authHeader.slice('Bearer '.length);
    const payload = this.tokenSigner.verifyAccessToken(token);
    request.user = payload;
    return true;
  }
}
