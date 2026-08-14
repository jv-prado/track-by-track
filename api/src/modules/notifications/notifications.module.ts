import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IdentityModule } from '../identity/identity.module';
import { NOTIFICATION_SENDER } from '../../shared/application/ports/notification-sender.port';
import {
  NotificationSchema,
  NotificationSchemaClass,
} from './notification.schema';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NotificationSchemaClass.name, schema: NotificationSchema },
    ]),
    IdentityModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    // Quem emite (Comments, Follows) injeta o Symbol, nunca a classe concreta —
    // é o que permite trocar por push depois sem tocar em emissor nenhum.
    { provide: NOTIFICATION_SENDER, useExisting: NotificationsService },
  ],
  exports: [NOTIFICATION_SENDER],
})
export class NotificationsModule {}
