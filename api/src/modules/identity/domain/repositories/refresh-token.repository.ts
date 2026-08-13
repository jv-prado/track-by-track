export const REFRESH_TOKEN_REPOSITORY = Symbol('RefreshTokenRepository');

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  family: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedByTokenHash: string | null;
  createdAt: Date;
}

export interface RefreshTokenRepository {
  create(record: {
    userId: string;
    tokenHash: string;
    family: string;
    expiresAt: Date;
  }): Promise<RefreshTokenRecord>;
  findByTokenHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  revokeFamily(family: string): Promise<void>;
  /** Logout de todos os dispositivos — usado após reset de senha. */
  revokeAllForUser(userId: string): Promise<void>;
  markRotated(id: string, replacedByTokenHash: string): Promise<void>;
}
