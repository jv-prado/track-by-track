import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IdentityModule } from '../identity/identity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FollowSchema, FollowSchemaClass } from './follow.schema';
import { FollowsController } from './follows.controller';
import { FollowsService } from './follows.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FollowSchemaClass.name, schema: FollowSchema },
    ]),
    IdentityModule,
    NotificationsModule,
  ],
  controllers: [FollowsController],
  providers: [FollowsService],
  // Discovery filtra o feed pelos seguidos (ver DiscoveryService.feed).
  exports: [FollowsService],
})
export class FollowsModule {}
