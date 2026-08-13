import { UniqueEntityId } from '../../../../shared/kernel/unique-entity-id';
import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { PasswordHash } from '../../domain/value-objects/password-hash.vo';
import { UserDocument } from './user.schema';

export class UserMapper {
  static toDomain(doc: UserDocument): User {
    return User.reconstitute(
      {
        email: Email.create(doc.email),
        passwordHash: doc.passwordHash
          ? PasswordHash.fromHash(doc.passwordHash)
          : null,
        displayName: doc.displayName,
        avatarUrl: doc.avatarUrl,
        mustResetPassword: doc.mustResetPassword,
        legacyFirebaseUid: doc.legacyFirebaseUid,
        legacySpotifyId: doc.legacySpotifyId,
        createdAt: doc.createdAt,
      },
      new UniqueEntityId(doc._id.toString()),
    );
  }

  static toPersistence(user: User) {
    return {
      _id: user.id.toString(),
      email: user.email.value,
      passwordHash: user.passwordHash?.value ?? null,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      mustResetPassword: user.mustResetPassword,
      legacyFirebaseUid: user.legacyFirebaseUid,
      legacySpotifyId: user.legacySpotifyId,
      createdAt: user.createdAt,
    };
  }
}
