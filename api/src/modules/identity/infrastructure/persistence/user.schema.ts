import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<UserSchemaClass>;

@Schema({
  collection: 'users',
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
})
export class UserSchemaClass {
  /** Sobrescreve o ObjectId padrão — o domínio gera o próprio id (UniqueEntityId, UUID). */
  @Prop({ type: String })
  _id!: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true,
  })
  email!: string;

  @Prop({ type: String, default: null })
  passwordHash!: string | null;

  @Prop({ type: String, required: true })
  displayName!: string;

  @Prop({ type: String })
  avatarUrl?: string;

  @Prop({ type: Boolean, required: true, default: false })
  mustResetPassword!: boolean;

  @Prop({ type: String, index: true })
  legacyFirebaseUid?: string;

  @Prop({ type: String, index: true })
  legacySpotifyId?: string;

  createdAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(UserSchemaClass);
