import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../domain/repositories/user.repository';
import { UserNotFoundError } from '../../../domain/errors/user-not-found.error';
import {
  GetCurrentUserInput,
  GetCurrentUserOutput,
} from './get-current-user.input';

@Injectable()
export class GetCurrentUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(input: GetCurrentUserInput): Promise<GetCurrentUserOutput> {
    const user = await this.users.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    return {
      id: user.id.toString(),
      email: user.email.value,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      mustResetPassword: user.mustResetPassword,
      createdAt: user.createdAt.toISOString(),
      role: user.role,
    };
  }
}
