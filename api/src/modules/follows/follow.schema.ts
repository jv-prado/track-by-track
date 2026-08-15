import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type FollowDocument = HydratedDocument<FollowSchemaClass>;

@Schema({ collection: 'follows', timestamps: false, versionKey: false })
export class FollowSchemaClass {
  @Prop({ type: SchemaTypes.ObjectId })
  _id!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  followerId!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  followeeId!: Types.ObjectId;

  @Prop({ type: Date, required: true })
  createdAt!: Date;
}

export const FollowSchema = SchemaFactory.createForClass(FollowSchemaClass);
// Um follow por par. É o mesmo índice que responde "quem eu sigo" e "eu sigo
// fulano?" (prefixo followerId), por isso não existe um `followerId: 1` solto.
FollowSchema.index({ followerId: 1, followeeId: 1 }, { unique: true });
// Lista de seguidores paginada por mais recente.
FollowSchema.index({ followeeId: 1, createdAt: -1 });
