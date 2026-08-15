import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../domain/repositories/user.repository';
import { UserNotFoundError } from '../../../domain/errors/user-not-found.error';
import {
  AVATAR_UPLOADER,
  type AvatarUploader,
} from '../../ports/avatar-uploader.port';
import { UploadAvatarInput, UploadAvatarOutput } from './upload-avatar.input';
import {
  CACHE_INVALIDATOR,
  type CacheInvalidator,
} from '../../../../../shared/application/ports/cache-invalidator.port';

@Injectable()
export class UploadAvatarUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(AVATAR_UPLOADER) private readonly avatarUploader: AvatarUploader,
    @Inject(CACHE_INVALIDATOR)
    private readonly cacheInvalidator: CacheInvalidator,
  ) {}

  async execute(input: UploadAvatarInput): Promise<UploadAvatarOutput> {
    const user = await this.users.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    const avatarUrl = await this.avatarUploader.upload(
      input.userId,
      input.file,
    );
    user.changeAvatarUrl(avatarUrl);
    await this.users.save(user);
    // avatarUrl também vai embutido no feed
    await this.cacheInvalidator.userProfileChanged(input.userId);

    return {
      id: user.id.toString(),
      email: user.email.value,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
    };
  }
}
