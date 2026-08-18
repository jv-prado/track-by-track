import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Feedback,
  FeedbackStatus,
} from '../../domain/entities/feedback.aggregate';
import {
  FeedbackRepository,
  FeedbackSearchResult,
} from '../../domain/repositories/feedback.repository';
import { FeedbackSchemaClass } from './feedback.schema';
import { FeedbackMapper } from './feedback.mapper';

@Injectable()
export class MongoFeedbackRepository implements FeedbackRepository {
  constructor(
    @InjectModel(FeedbackSchemaClass.name)
    private readonly model: Model<FeedbackSchemaClass>,
  ) {}

  async save(feedback: Feedback): Promise<void> {
    const persistence = FeedbackMapper.toPersistence(feedback);
    await this.model.updateOne(
      { _id: persistence._id },
      { $set: persistence },
      { upsert: true },
    );
  }

  async findById(id: string): Promise<Feedback | null> {
    const doc = await this.model.findById(id).lean().exec();
    return doc ? FeedbackMapper.toDomain(doc) : null;
  }

  async findByUser(
    userId: string,
    limit: number,
    offset: number,
    status?: FeedbackStatus,
  ): Promise<FeedbackSearchResult> {
    const filter: Record<string, unknown> = { userId };
    if (status) {
      filter.status = status;
    }

    const [docs, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean()
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((doc) => FeedbackMapper.toDomain(doc)),
      total,
    };
  }

  async findAll(
    limit: number,
    offset: number,
    status?: FeedbackStatus,
  ): Promise<FeedbackSearchResult> {
    const filter: Record<string, unknown> = {};
    if (status) {
      filter.status = status;
    }

    const [docs, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean()
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return {
      items: docs.map((doc) => FeedbackMapper.toDomain(doc)),
      total,
    };
  }

  async countUnanswered(): Promise<number> {
    return this.model.countDocuments({ status: 'open' }).exec();
  }
}
