import { User } from '../entities/user.entity';

export const USER_REPOSITORY = Symbol('UserRepository');

export interface UserSearchResult {
  items: User[];
  total: number;
}

export interface UserRepository {
  save(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByDisplayName(displayName: string): Promise<User | null>;
  search(
    query: string,
    limit: number,
    offset: number,
  ): Promise<UserSearchResult>;
  delete(id: string): Promise<void>;
}
