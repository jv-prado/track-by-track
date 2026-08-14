import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IdentityModule } from '../identity/identity.module';
import { RankingModule } from '../ranking/ranking.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CommentSchema, CommentSchemaClass } from './comment.schema';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CommentSchemaClass.name, schema: CommentSchema },
    ]),
    IdentityModule,
    RankingModule,
    NotificationsModule,
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
