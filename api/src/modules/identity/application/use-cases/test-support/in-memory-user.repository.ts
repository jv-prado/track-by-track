import { User } from '../../../domain/entities/user.entity';
import { UserRepository } from '../../../domain/repositories/user.repository';

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  save(user: User): Promise<void> {
    this.users.set(user.id.toString(), user);
    return Promise.resolve();
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.users.get(id) ?? null);
  }

  findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email.value === email.toLowerCase()) {
        return Promise.resolve(user);
      }
    }
    return Promise.resolve(null);
  }

  findByDisplayName(displayName: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.displayName.toLowerCase() === displayName.toLowerCase()) {
        return Promise.resolve(user);
      }
    }
    return Promise.resolve(null);
  }

  delete(id: string): Promise<void> {
    this.users.delete(id);
    return Promise.resolve();
  }
}
