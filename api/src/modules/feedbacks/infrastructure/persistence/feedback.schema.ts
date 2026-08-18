import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

@Schema({ _id: true, timestamps: false, versionKey: false })
export class FeedbackMessageSchemaClass {
  @Prop({ type: SchemaTypes.ObjectId })
  _id!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId })
  userId?: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId })
  adminId?: Types.ObjectId;

  @Prop({ type: String, required: true })
  message!: string;

  @Prop({ type: Date, required: true, default: Date.now })
  createdAt!: Date;
}

export const FeedbackMessageSchema = SchemaFactory.createForClass(
  FeedbackMessageSchemaClass,
);

export type FeedbackDocument = HydratedDocument<FeedbackSchemaClass>;
export type FeedbackLean = FeedbackSchemaClass;

@Schema({ collection: 'feedbacks', timestamps: false, versionKey: false })
export class FeedbackSchemaClass {
  @Prop({ type: SchemaTypes.ObjectId })
  _id!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String })
  subject?: string;

  @Prop({
    type: String,
    enum: ['open', 'answered', 'closed'],
    required: true,
    default: 'open',
    index: true,
  })
  status!: 'open' | 'answered' | 'closed';

  @Prop({ type: [FeedbackMessageSchema], default: [] })
  messages!: FeedbackMessageSchemaClass[];

  @Prop({ type: Date, required: true, default: Date.now })
  createdAt!: Date;

  @Prop({ type: Date, required: true, default: Date.now })
  updatedAt!: Date;
}

export const FeedbackSchema = SchemaFactory.createForClass(FeedbackSchemaClass);

// Listagens filtradas por usuário ordenadas por atualização
FeedbackSchema.index({ userId: 1, updatedAt: -1 });
// Listagens filtradas por status ordenadas por atualização (para admin)
FeedbackSchema.index({ status: 1, updatedAt: -1 });
// Listagem geral ordenada por atualização
FeedbackSchema.index({ updatedAt: -1 });
