import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  RefreshTokenRecord,
  RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository';
import { RefreshTokenSchemaClass } from './refresh-token.schema';
import { newObjectId } from '../../../../shared/kernel/object-id';

// `.toObject()` (após `.create()`) tipa `_id` como `string` mesmo com schema
// ObjectId — só `.lean()` reflete o tipo declarado. Aceita os dois formatos.
function toRecord(
  doc: Omit<RefreshTokenSchemaClass, '_id' | 'userId'> & {
    _id: Types.ObjectId | string;
    userId: Types.ObjectId | string;
  },
): RefreshTokenRecord {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
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
      _id: newObjectId(),
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

  async markRotated(id: string, replacedByTokenHash: string): Promise<boolean> {
    // A condição no filtro é o que torna isto atômico: sem ela, dois usos
    // simultâneos do mesmo token liam `replacedByTokenHash: null` antes de
    // qualquer escrita e ambos rotacionavam com sucesso.
    const result = await this.model.updateOne(
      { _id: id, replacedByTokenHash: null, revokedAt: null },
      { $set: { replacedByTokenHash } },
    );
    return result.modifiedCount === 1;
  }
}
