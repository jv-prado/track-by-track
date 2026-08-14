import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<UserSchemaClass>;

/**
 * Resultado de leitura com `lean()` — objeto puro, sem os métodos do Document.
 * É o que o mapper consome: aceita tanto o lean quanto o hidratado.
 */
export type UserLean = UserSchemaClass & { _id: string };

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

  /** Espelho normalizado de `displayName` — sustenta o índice único
   * case-insensitive sem precisar de collation na query. */
  @Prop({
    type: String,
    required: true,
    unique: true,
    index: true,
  })
  displayNameLower!: string;

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
