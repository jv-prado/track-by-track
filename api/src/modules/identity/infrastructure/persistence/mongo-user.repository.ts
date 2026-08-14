import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../domain/entities/user.entity';
import {
  UserRepository,
  UserSearchResult,
} from '../../domain/repositories/user.repository';
import { UserSchemaClass } from './user.schema';
import { UserMapper } from './user.mapper';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class MongoUserRepository implements UserRepository {
  constructor(
    @InjectModel(UserSchemaClass.name)
    private readonly model: Model<UserSchemaClass>,
  ) {}

  async save(user: User): Promise<void> {
    const persistence = UserMapper.toPersistence(user);
    await this.model.updateOne(
      { _id: persistence._id },
      { $set: persistence },
      { upsert: true },
    );
  }

  // `lean()` em toda leitura: a escrita sempre vai por `updateOne`/upsert com o
  // que o mapper serializa, então o documento hidratado nunca volta pro banco —
  // hidratar aqui é custo puro nos caminhos mais quentes (login, /me).
  async findById(id: string): Promise<User | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? UserMapper.toDomain(doc) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const doc = await this.model
      .findOne({ email: email.toLowerCase() })
      .lean()
      .exec();
    return doc ? UserMapper.toDomain(doc) : null;
  }

  async findByDisplayName(displayName: string): Promise<User | null> {
    const doc = await this.model
      .findOne({ displayNameLower: displayName.toLowerCase() })
      .lean()
      .exec();
    return doc ? UserMapper.toDomain(doc) : null;
  }

  async search(
    query: string,
    limit: number,
    offset: number,
  ): Promise<UserSearchResult> {
    const filter = {
      displayNameLower: {
        $regex: escapeRegex(query.toLowerCase()),
        $options: 'i',
      },
    };
    const [docs, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ displayNameLower: 1 })
        .skip(offset)
        .limit(limit)
        .lean()
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { items: docs.map((doc) => UserMapper.toDomain(doc)), total };
  }

  async delete(id: string): Promise<void> {
    await this.model.deleteOne({ _id: id }).exec();
  }
}
