import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AlbumRanking } from '../../domain/entities/album-ranking.aggregate';
import { RankingRepository } from '../../domain/repositories/ranking.repository';
import { RankingSchemaClass } from './ranking.schema';
import { RankingMapper } from './ranking.mapper';

@Injectable()
export class MongoRankingRepository implements RankingRepository {
  constructor(
    @InjectModel(RankingSchemaClass.name)
    private readonly model: Model<RankingSchemaClass>,
  ) {}

  async save(ranking: AlbumRanking): Promise<void> {
    const persistence = RankingMapper.toPersistence(ranking);
    await this.model.updateOne(
      { _id: persistence._id },
      { $set: persistence },
      { upsert: true },
    );
  }

  async findById(id: string): Promise<AlbumRanking | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? RankingMapper.toDomain(doc) : null;
  }

  async findByUserAndAlbum(
    userId: string,
    albumId: string,
  ): Promise<AlbumRanking | null> {
    const doc = await this.model.findOne({ userId, albumId }).exec();
    return doc ? RankingMapper.toDomain(doc) : null;
  }

  async delete(id: string): Promise<void> {
    await this.model.deleteOne({ _id: id }).exec();
  }
}
