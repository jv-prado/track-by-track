import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../domain/repositories/user.repository';
import { UserNotFoundError } from '../../../domain/errors/user-not-found.error';
import { DisplayNameAlreadyTakenError } from '../../../domain/errors/display-name-already-taken.error';
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

    const displayName = input.displayName.trim();
    // só bloqueia se o nome pertence a OUTRO usuário — permite salvar sem
    // trocar nada (mesmo displayName do próprio usuário) sem falso 409.
    const existing = await this.users.findByDisplayName(displayName);
    if (existing && existing.id.toString() !== user.id.toString()) {
      throw new DisplayNameAlreadyTakenError(displayName);
    }

    user.changeDisplayName(displayName);
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
