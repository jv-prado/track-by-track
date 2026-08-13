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
import {
  ACCOUNT_CASCADE_DELETE,
  type AccountCascadeDelete,
} from '../../ports/account-cascade-delete.port';
import { DeleteAccountInput } from './delete-account.input';
import {
  CACHE_INVALIDATOR,
  type CacheInvalidator,
} from '../../../../../shared/application/ports/cache-invalidator.port';

@Injectable()
export class DeleteAccountUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepository,
    @Inject(HASHER) private readonly hasher: Hasher,
    @Inject(ACCOUNT_CASCADE_DELETE)
    private readonly cascadeDelete: AccountCascadeDelete,
    @Inject(CACHE_INVALIDATOR)
    private readonly cacheInvalidator: CacheInvalidator,
  ) {}

  async execute(input: DeleteAccountInput): Promise<void> {
    const user = await this.users.findById(input.userId);
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

    await this.cascadeDelete.deleteAllForUser(user.id.toString());
    await this.refreshTokens.revokeAllForUser(user.id.toString());
    await this.users.delete(user.id.toString());
    // cascade apaga os rankings do usuário: feed e top-albums mudam junto
    await this.cacheInvalidator.userProfileChanged(user.id.toString());
  }
}
