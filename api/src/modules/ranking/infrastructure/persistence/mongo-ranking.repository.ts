import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AlbumRanking } from '../../domain/entities/album-ranking.aggregate';
import { RankingRepository } from '../../domain/repositories/ranking.repository';
import { RankingSchemaClass } from './ranking.schema';
import { RankingMapper } from './ranking.mapper';
import { RankingAlreadyExistsError } from '../../domain/errors/ranking-already-exists.error';

const DUPLICATE_KEY_CODE = 11000;

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === DUPLICATE_KEY_CODE
  );
}

@Injectable()
export class MongoRankingRepository implements RankingRepository {
  constructor(
    @InjectModel(RankingSchemaClass.name)
    private readonly model: Model<RankingSchemaClass>,
  ) {}

  async save(ranking: AlbumRanking): Promise<void> {
    const persistence = RankingMapper.toPersistence(ranking);
    try {
      await this.model.updateOne(
        { _id: persistence._id },
        { $set: persistence },
        { upsert: true },
      );
    } catch (error) {
      // O upsert é por `_id`; quem garante "um ranking por usuário por álbum" é
      // o índice único composto do schema. Sem esta tradução, duas criações
      // concorrentes (duplo clique, duas abas) viravam 500 INTERNAL_ERROR.
      if (isDuplicateKeyError(error)) {
        throw new RankingAlreadyExistsError();
      }
      throw error;
    }
  }

  // `lean()`: o agregado é reconstruído pelo mapper e persistido por upsert —
  // o documento hidratado nunca é salvo de volta.
  async findById(id: string): Promise<AlbumRanking | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? RankingMapper.toDomain(doc) : null;
  }

  async findByUserAndAlbum(
    userId: string,
    albumId: string,
  ): Promise<AlbumRanking | null> {
    const doc = await this.model.findOne({ userId, albumId }).lean().exec();
    return doc ? RankingMapper.toDomain(doc) : null;
  }

  async delete(id: string): Promise<void> {
    await this.model.deleteOne({ _id: id }).exec();
  }
}
