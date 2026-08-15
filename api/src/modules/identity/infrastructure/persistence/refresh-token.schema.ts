import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type RefreshTokenDocument = HydratedDocument<RefreshTokenSchemaClass>;

@Schema({
  collection: 'refreshtokens',
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
})
export class RefreshTokenSchemaClass {
  @Prop({ type: SchemaTypes.ObjectId })
  _id!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true, unique: true, index: true })
  tokenHash!: string;

  @Prop({ type: String, required: true, index: true })
  family!: string;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  @Prop({ type: Date, default: null })
  revokedAt!: Date | null;

  @Prop({ type: String, default: null })
  replacedByTokenHash!: string | null;

  createdAt!: Date;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(
  RefreshTokenSchemaClass,
);
