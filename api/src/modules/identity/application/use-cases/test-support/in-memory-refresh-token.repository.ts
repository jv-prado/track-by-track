import { randomUUID } from 'crypto';
import {
  RefreshTokenRecord,
  RefreshTokenRepository,
} from '../../../domain/repositories/refresh-token.repository';

export class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  private readonly records = new Map<string, RefreshTokenRecord>();

  create(record: {
    userId: string;
    tokenHash: string;
    family: string;
    expiresAt: Date;
  }): Promise<RefreshTokenRecord> {
    const created: RefreshTokenRecord = {
      id: randomUUID(),
      revokedAt: null,
      replacedByTokenHash: null,
      createdAt: new Date(),
      ...record,
    };
    this.records.set(created.id, created);
    return Promise.resolve(created);
  }

  findByTokenHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    for (const record of this.records.values()) {
      if (record.tokenHash === tokenHash) return Promise.resolve(record);
    }
    return Promise.resolve(null);
  }

  revokeFamily(family: string): Promise<void> {
    for (const record of this.records.values()) {
      if (record.family === family && !record.revokedAt) {
        record.revokedAt = new Date();
      }
    }
    return Promise.resolve();
  }

  revokeAllForUser(userId: string): Promise<void> {
    for (const record of this.records.values()) {
      if (record.userId === userId && !record.revokedAt) {
        record.revokedAt = new Date();
      }
    }
    return Promise.resolve();
  }

  markRotated(id: string, replacedByTokenHash: string): Promise<void> {
    const record = this.records.get(id);
    if (record) {
      record.replacedByTokenHash = replacedByTokenHash;
    }
    return Promise.resolve();
  }
}
