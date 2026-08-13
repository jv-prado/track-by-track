import { randomBytes, randomUUID, createHash } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseDurationToMs } from '../../../../shared/infrastructure/utils/parse-duration';

export interface IssuedRefreshToken {
  token: string;
  tokenHash: string;
  family: string;
  expiresAt: Date;
}

/** Único ponto de config que este serviço precisa — permite fake simples nos testes. */
export interface RefreshTtlConfig {
  get(key: 'JWT_REFRESH_TTL'): string;
}

@Injectable()
export class RefreshTokenIssuer {
  constructor(
    @Inject(ConfigService) private readonly config: RefreshTtlConfig,
  ) {}

  issue(family?: string): IssuedRefreshToken {
    const token = randomBytes(32).toString('hex');
    const ttl = this.config.get('JWT_REFRESH_TTL');
    return {
      token,
      tokenHash: this.hash(token),
      family: family ?? randomUUID(),
      expiresAt: new Date(Date.now() + parseDurationToMs(ttl)),
    };
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
