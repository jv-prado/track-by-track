import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PasswordResetTokenDocument =
  HydratedDocument<PasswordResetTokenSchemaClass>;

@Schema({
  collection: 'passwordresettokens',
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
})
export class PasswordResetTokenSchemaClass {
  @Prop({ type: String })
  _id!: string;

  @Prop({ type: String, required: true, index: true })
  userId!: string;

  @Prop({ type: String, required: true, unique: true, index: true })
  tokenHash!: string;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  @Prop({ type: Date, default: null })
  usedAt!: Date | null;

  createdAt!: Date;
}

export const PasswordResetTokenSchema = SchemaFactory.createForClass(
  PasswordResetTokenSchemaClass,
);
