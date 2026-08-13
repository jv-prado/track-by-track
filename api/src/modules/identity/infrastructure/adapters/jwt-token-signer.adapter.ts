import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AccessTokenPayload,
  TokenSigner,
} from '../../application/ports/token-signer.port';

@Injectable()
export class JwtTokenSignerAdapter implements TokenSigner {
  constructor(@Inject(JwtService) private readonly jwt: JwtService) {}

  signAccessToken(payload: AccessTokenPayload): string {
    return this.jwt.sign(payload);
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      return this.jwt.verify<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Token de acesso inválido ou expirado.');
    }
  }
}
