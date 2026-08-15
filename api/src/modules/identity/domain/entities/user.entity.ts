import { AggregateRoot } from '../../../../shared/kernel/aggregate-root';
import { UniqueEntityId } from '../../../../shared/kernel/unique-entity-id';
import { Email } from '../value-objects/email.vo';
import { PasswordHash } from '../value-objects/password-hash.vo';
import { UserRegisteredEvent } from '../events/user-registered.event';

export type UserRole = 'user' | 'admin';

export interface UserProps {
  email: Email;
  /** null só para contas migradas do Firestore que nunca tiveram senha real (ver Fase 7). */
  passwordHash: PasswordHash | null;
  displayName: string;
  avatarUrl?: string;
  mustResetPassword: boolean;
  legacyFirebaseUid?: string;
  legacySpotifyId?: string;
  createdAt: Date;
  role: UserRole;
}

export interface CreateUserProps {
  email: Email;
  passwordHash: PasswordHash;
  displayName: string;
}

export class User extends AggregateRoot<UserProps> {
  private constructor(props: UserProps, id?: UniqueEntityId) {
    super(props, id);
  }

  static create(props: CreateUserProps): User {
    const user = new User({
      ...props,
      mustResetPassword: false,
      createdAt: new Date(),
      role: 'user',
    });
    user.addDomainEvent(
      new UserRegisteredEvent(user.id.toString(), user.email.value),
    );
    return user;
  }

  static reconstitute(props: UserProps, id: UniqueEntityId): User {
    return new User(props, id);
  }

  get email(): Email {
    return this.props.email;
  }

  get passwordHash(): PasswordHash | null {
    return this.props.passwordHash;
  }

  get displayName(): string {
    return this.props.displayName;
  }

  get avatarUrl(): string | undefined {
    return this.props.avatarUrl;
  }

  get mustResetPassword(): boolean {
    return this.props.mustResetPassword;
  }

  get legacyFirebaseUid(): string | undefined {
    return this.props.legacyFirebaseUid;
  }

  get legacySpotifyId(): string | undefined {
    return this.props.legacySpotifyId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get role(): UserRole {
    return this.props.role;
  }

  changePassword(newPasswordHash: PasswordHash): void {
    this.props.passwordHash = newPasswordHash;
    this.props.mustResetPassword = false;
  }

  changeDisplayName(displayName: string): void {
    this.props.displayName = displayName;
  }

  changeAvatarUrl(avatarUrl: string): void {
    this.props.avatarUrl = avatarUrl;
  }
}
