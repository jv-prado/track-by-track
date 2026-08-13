import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../domain/entities/user.entity';
import { UserRepository } from '../../domain/repositories/user.repository';
import { UserSchemaClass } from './user.schema';
import { UserMapper } from './user.mapper';

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

  async findById(id: string): Promise<User | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? UserMapper.toDomain(doc) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const doc = await this.model.findOne({ email: email.toLowerCase() }).exec();
    return doc ? UserMapper.toDomain(doc) : null;
  }

  async delete(id: string): Promise<void> {
    await this.model.deleteOne({ _id: id }).exec();
  }
}
