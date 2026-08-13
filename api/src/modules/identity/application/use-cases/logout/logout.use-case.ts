import { Inject, Injectable } from '@nestjs/common';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../../domain/repositories/refresh-token.repository';
import { RefreshTokenIssuer } from '../../services/refresh-token-issuer.service';

export interface LogoutInput {
  refreshToken: string;
}

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
    @Inject(RefreshTokenIssuer)
    private readonly refreshTokenIssuer: RefreshTokenIssuer,
  ) {}

  async execute(input: LogoutInput): Promise<void> {
    const tokenHash = this.refreshTokenIssuer.hash(input.refreshToken);
    const record = await this.refreshTokens.findByTokenHash(tokenHash);
    if (record) {
      await this.refreshTokens.revokeFamily(record.family);
    }
  }
}
