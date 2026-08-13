import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../domain/repositories/user.repository';
import {
  REFRESH_TOKEN_REPOSITORY,
  type RefreshTokenRepository,
} from '../../../domain/repositories/refresh-token.repository';
import { InvalidCredentialsError } from '../../../domain/errors/invalid-credentials.error';
import { HASHER, type Hasher } from '../../ports/hasher.port';
import { TOKEN_SIGNER, type TokenSigner } from '../../ports/token-signer.port';
import { RefreshTokenIssuer } from '../../services/refresh-token-issuer.service';
import {
  AuthenticateUserInput,
  AuthenticateUserOutput,
} from './authenticate-user.input';

@Injectable()
export class AuthenticateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
    @Inject(HASHER) private readonly hasher: Hasher,
    @Inject(TOKEN_SIGNER) private readonly tokenSigner: TokenSigner,
    @Inject(RefreshTokenIssuer)
    private readonly refreshTokenIssuer: RefreshTokenIssuer,
  ) {}

  async execute(input: AuthenticateUserInput): Promise<AuthenticateUserOutput> {
    const user = await this.users.findByEmail(input.email.trim().toLowerCase());
    const passwordHash = user?.passwordHash;

    if (!user || !passwordHash) {
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await this.hasher.verify(
      input.password,
      passwordHash.value,
    );
    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    const accessToken = this.tokenSigner.signAccessToken({
      sub: user.id.toString(),
      email: user.email.value,
    });

    const issued = this.refreshTokenIssuer.issue();
    await this.refreshTokens.create({
      userId: user.id.toString(),
      tokenHash: issued.tokenHash,
      family: issued.family,
      expiresAt: issued.expiresAt,
    });

    return {
      accessToken,
      refreshToken: issued.token,
      refreshTokenExpiresAt: issued.expiresAt,
      user: {
        id: user.id.toString(),
        email: user.email.value,
        displayName: user.displayName,
      },
    };
  }
}
