import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PasswordResetTokenRecord,
  PasswordResetTokenRepository,
} from '../../domain/repositories/password-reset-token.repository';
import { PasswordResetTokenSchemaClass } from './password-reset-token.schema';

function toRecord(
  doc: PasswordResetTokenSchemaClass & { _id: string },
): PasswordResetTokenRecord {
  return {
    id: doc._id,
    userId: doc.userId,
    tokenHash: doc.tokenHash,
    expiresAt: doc.expiresAt,
    usedAt: doc.usedAt,
    createdAt: doc.createdAt,
  };
}

@Injectable()
export class MongoPasswordResetTokenRepository implements PasswordResetTokenRepository {
  constructor(
    @InjectModel(PasswordResetTokenSchemaClass.name)
    private readonly model: Model<PasswordResetTokenSchemaClass>,
  ) {}

  async create(record: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PasswordResetTokenRecord> {
    const created = await this.model.create({
      _id: randomUUID(),
      ...record,
      usedAt: null,
    });
    return toRecord(created.toObject());
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<PasswordResetTokenRecord | null> {
    const doc = await this.model.findOne({ tokenHash }).lean().exec();
    return doc ? toRecord(doc) : null;
  }

  async markUsed(id: string): Promise<void> {
    await this.model.updateOne({ _id: id }, { $set: { usedAt: new Date() } });
  }
}
