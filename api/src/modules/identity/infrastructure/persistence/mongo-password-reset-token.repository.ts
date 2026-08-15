import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  PasswordResetTokenRecord,
  PasswordResetTokenRepository,
} from '../../domain/repositories/password-reset-token.repository';
import { PasswordResetTokenSchemaClass } from './password-reset-token.schema';
import { newObjectId } from '../../../../shared/kernel/object-id';

// `.toObject()` (após `.create()`) tipa `_id` como `string` mesmo com schema
// ObjectId — só `.lean()` reflete o tipo declarado. Aceita os dois formatos.
function toRecord(
  doc: Omit<PasswordResetTokenSchemaClass, '_id' | 'userId'> & {
    _id: Types.ObjectId | string;
    userId: Types.ObjectId | string;
  },
): PasswordResetTokenRecord {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
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
      _id: newObjectId(),
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
