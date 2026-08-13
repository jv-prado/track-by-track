import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/repositories/user.repository';

export interface PublicUserProfile {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

/** Único ponto de acesso a dados públicos de usuário para outros módulos (Comments, Discovery). */
@Injectable()
export class UserDirectoryService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async getPublicProfile(userId: string): Promise<PublicUserProfile | null> {
    const user = await this.users.findById(userId);
    if (!user) return null;
    return {
      id: user.id.toString(),
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    };
  }
}
