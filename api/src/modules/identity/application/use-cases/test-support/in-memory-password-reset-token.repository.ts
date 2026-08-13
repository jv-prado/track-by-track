import { randomUUID } from 'crypto';
import {
  PasswordResetTokenRecord,
  PasswordResetTokenRepository,
} from '../../../domain/repositories/password-reset-token.repository';

export class InMemoryPasswordResetTokenRepository implements PasswordResetTokenRepository {
  private readonly records = new Map<string, PasswordResetTokenRecord>();

  create(record: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PasswordResetTokenRecord> {
    const created: PasswordResetTokenRecord = {
      id: randomUUID(),
      usedAt: null,
      createdAt: new Date(),
      ...record,
    };
    this.records.set(created.id, created);
    return Promise.resolve(created);
  }

  findByTokenHash(tokenHash: string): Promise<PasswordResetTokenRecord | null> {
    for (const record of this.records.values()) {
      if (record.tokenHash === tokenHash) return Promise.resolve(record);
    }
    return Promise.resolve(null);
  }

  markUsed(id: string): Promise<void> {
    const record = this.records.get(id);
    if (record) {
      record.usedAt = new Date();
    }
    return Promise.resolve();
  }
}
