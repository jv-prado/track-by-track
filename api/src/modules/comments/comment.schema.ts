import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CommentDocument = HydratedDocument<CommentSchemaClass>;

@Schema({ collection: 'comments', timestamps: false, versionKey: false })
export class CommentSchemaClass {
  @Prop({ type: String })
  _id!: string;

  @Prop({ type: String, required: true })
  rankingId!: string;

  @Prop({ type: String, required: true, index: true })
  authorId!: string;

  @Prop({ type: String, required: true })
  authorDisplayName!: string;

  @Prop({ type: String })
  authorAvatarUrl?: string;

  @Prop({ type: String, required: true })
  text!: string;

  @Prop({ type: Date, required: true })
  createdAt!: Date;

  @Prop({ type: Date, default: null })
  editedAt!: Date | null;
}

export const CommentSchema = SchemaFactory.createForClass(CommentSchemaClass);
// `listByRanking`: filtra rankingId, ordena por createdAt desc — única leitura real.
CommentSchema.index({ rankingId: 1, createdAt: -1 });
