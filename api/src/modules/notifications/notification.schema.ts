import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const NOTIFICATION_TYPES = ['comment', 'follow'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationDocument = HydratedDocument<NotificationSchemaClass>;

@Schema({ collection: 'notifications', timestamps: false, versionKey: false })
export class NotificationSchemaClass {
  @Prop({ type: String })
  _id!: string;

  /** Destinatário. Toda leitura é escopada por ele — nunca vem do cliente. */
  @Prop({ type: String, required: true })
  userId!: string;

  @Prop({ type: String, required: true, enum: NOTIFICATION_TYPES })
  type!: NotificationType;

  @Prop({ type: String, required: true })
  actorId!: string;

  // Nome e avatar do ator ficam denormalizados (como em `comments`): a listagem
  // é a leitura mais frequente e não pode depender de $lookup em `users`.
  @Prop({ type: String, required: true })
  actorDisplayName!: string;

  @Prop({ type: String })
  actorAvatarUrl?: string;

  /** Só em `comment` — é pra onde o clique na notificação leva. */
  @Prop({ type: String })
  rankingId?: string;

  @Prop({ type: String })
  albumId?: string;

  @Prop({ type: Date, default: null })
  readAt!: Date | null;

  @Prop({ type: Date, required: true })
  createdAt!: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(
  NotificationSchemaClass,
);
// Listagem: filtra destinatário, ordena por mais recente.
NotificationSchema.index({ userId: 1, createdAt: -1 });
// Badge do sino: conta não lidas do destinatário.
NotificationSchema.index({ userId: 1, readAt: 1 });
