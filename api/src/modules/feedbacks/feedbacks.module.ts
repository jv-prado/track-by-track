import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IdentityModule } from '../identity/identity.module';
import { FEEDBACK_REPOSITORY } from './domain/repositories/feedback.repository';
import {
  FeedbackSchema,
  FeedbackSchemaClass,
} from './infrastructure/persistence/feedback.schema';
import { MongoFeedbackRepository } from './infrastructure/persistence/mongo-feedback.repository';
import { FeedbacksService } from './application/feedbacks.service';
import { FeedbacksController } from './presentation/feedbacks.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FeedbackSchemaClass.name, schema: FeedbackSchema },
    ]),
    IdentityModule,
  ],
  controllers: [FeedbacksController],
  providers: [
    { provide: FEEDBACK_REPOSITORY, useClass: MongoFeedbackRepository },
    FeedbacksService,
  ],
  exports: [FeedbacksService],
})
export class FeedbacksModule {}
