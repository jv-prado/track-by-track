import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/repositories/user.repository';

export interface PublicUserProfile {
  id: string;
  displayName: string;
  avatarUrl?: string;
  /** Data de cadastro (ISO 8601 UTC) — "membro desde" nos cards de usuário. */
  createdAt: string;
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
      createdAt: user.createdAt.toISOString(),
    };
  }

  async searchPublicProfiles(
    query: string,
    limit: number,
    offset: number,
  ): Promise<{ items: PublicUserProfile[]; total: number }> {
    const { items, total } = await this.users.search(query, limit, offset);
    return {
      items: items.map((user) => ({
        id: user.id.toString(),
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt.toISOString(),
      })),
      total,
    };
  }
}
