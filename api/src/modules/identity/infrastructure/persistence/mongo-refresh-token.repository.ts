import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  RefreshTokenRecord,
  RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository';
import { RefreshTokenSchemaClass } from './refresh-token.schema';

function toRecord(
  doc: RefreshTokenSchemaClass & { _id: string },
): RefreshTokenRecord {
  return {
    id: doc._id,
    userId: doc.userId,
    tokenHash: doc.tokenHash,
    family: doc.family,
    expiresAt: doc.expiresAt,
    revokedAt: doc.revokedAt,
    replacedByTokenHash: doc.replacedByTokenHash,
    createdAt: doc.createdAt,
  };
}

@Injectable()
export class MongoRefreshTokenRepository implements RefreshTokenRepository {
  constructor(
    @InjectModel(RefreshTokenSchemaClass.name)
    private readonly model: Model<RefreshTokenSchemaClass>,
  ) {}

  async create(record: {
    userId: string;
    tokenHash: string;
    family: string;
    expiresAt: Date;
  }): Promise<RefreshTokenRecord> {
    const created = await this.model.create({
      _id: randomUUID(),
      ...record,
      revokedAt: null,
      replacedByTokenHash: null,
    });
    return toRecord(created.toObject());
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const doc = await this.model.findOne({ tokenHash }).lean().exec();
    return doc ? toRecord(doc) : null;
  }

  async revokeFamily(family: string): Promise<void> {
    await this.model.updateMany(
      { family, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.model.updateMany(
      { userId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  }

  async markRotated(id: string, replacedByTokenHash: string): Promise<void> {
    await this.model.updateOne({ _id: id }, { $set: { replacedByTokenHash } });
  }
}
