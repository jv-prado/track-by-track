import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../domain/repositories/user.repository';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../../domain/repositories/refresh-token.repository';
import { InvalidRefreshTokenError } from '../../../domain/errors/invalid-refresh-token.error';
import { TOKEN_SIGNER, type TokenSigner } from '../../ports/token-signer.port';
import { RefreshTokenIssuer } from '../../services/refresh-token-issuer.service';
import { RefreshTokenInput, RefreshTokenOutput } from './refresh-token.input';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
    @Inject(TOKEN_SIGNER) private readonly tokenSigner: TokenSigner,
    @Inject(RefreshTokenIssuer)
    private readonly refreshTokenIssuer: RefreshTokenIssuer,
  ) {}

  async execute(input: RefreshTokenInput): Promise<RefreshTokenOutput> {
    const tokenHash = this.refreshTokenIssuer.hash(input.refreshToken);
    const record = await this.refreshTokens.findByTokenHash(tokenHash);

    if (!record || record.revokedAt) {
      throw new InvalidRefreshTokenError();
    }

    if (record.replacedByTokenHash) {
      // Token já rotacionado sendo reapresentado — reuso, possível token roubado.
      await this.refreshTokens.revokeFamily(record.family);
      throw new InvalidRefreshTokenError();
    }

    if (record.expiresAt.getTime() < Date.now()) {
      throw new InvalidRefreshTokenError();
    }

    const user = await this.users.findById(record.userId);
    if (!user) {
      throw new InvalidRefreshTokenError();
    }

    const issued = this.refreshTokenIssuer.issue(record.family);
    await this.refreshTokens.markRotated(record.id, issued.tokenHash);
    await this.refreshTokens.create({
      userId: user.id.toString(),
      tokenHash: issued.tokenHash,
      family: issued.family,
      expiresAt: issued.expiresAt,
    });

    const accessToken = this.tokenSigner.signAccessToken({
      sub: user.id.toString(),
      email: user.email.value,
    });

    return {
      accessToken,
      refreshToken: issued.token,
      refreshTokenExpiresAt: issued.expiresAt,
    };
  }
}
