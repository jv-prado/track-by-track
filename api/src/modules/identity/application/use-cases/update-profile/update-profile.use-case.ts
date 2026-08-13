import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../domain/repositories/user.repository';
import { UserNotFoundError } from '../../../domain/errors/user-not-found.error';
import {
  UpdateProfileInput,
  UpdateProfileOutput,
} from './update-profile.input';
import {
  CACHE_INVALIDATOR,
  type CacheInvalidator,
} from '../../../../../shared/application/ports/cache-invalidator.port';

@Injectable()
export class UpdateProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CACHE_INVALIDATOR)
    private readonly cacheInvalidator: CacheInvalidator,
  ) {}

  async execute(input: UpdateProfileInput): Promise<UpdateProfileOutput> {
    const user = await this.users.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    user.changeDisplayName(input.displayName.trim());
    await this.users.save(user);
    // displayName vai embutido em cada item do feed e das reviews de álbum
    await this.cacheInvalidator.userProfileChanged(input.userId);

    return {
      id: user.id.toString(),
      email: user.email.value,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    };
  }
}
