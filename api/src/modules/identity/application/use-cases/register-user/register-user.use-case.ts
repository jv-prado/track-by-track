import { Inject, Injectable } from '@nestjs/common';
import { Email } from '../../../domain/value-objects/email.vo';
import { PasswordHash } from '../../../domain/value-objects/password-hash.vo';
import { User } from '../../../domain/entities/user.entity';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../domain/repositories/user.repository';
import { EmailAlreadyTakenError } from '../../../domain/errors/email-already-taken.error';
import { WeakPasswordError } from '../../../domain/errors/weak-password.error';
import { HASHER, type Hasher } from '../../ports/hasher.port';
import { RegisterUserInput, RegisterUserOutput } from './register-user.input';

const MIN_PASSWORD_LENGTH = 8;

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(HASHER) private readonly hasher: Hasher,
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    const email = Email.create(input.email);

    if (input.password.length < MIN_PASSWORD_LENGTH) {
      throw new WeakPasswordError();
    }

    const existing = await this.users.findByEmail(email.value);
    if (existing) {
      throw new EmailAlreadyTakenError(email.value);
    }

    const hash = await this.hasher.hash(input.password);
    const user = User.create({
      email,
      passwordHash: PasswordHash.fromHash(hash),
      displayName: input.displayName.trim(),
    });

    await this.users.save(user);

    return {
      id: user.id.toString(),
      email: user.email.value,
      displayName: user.displayName,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
