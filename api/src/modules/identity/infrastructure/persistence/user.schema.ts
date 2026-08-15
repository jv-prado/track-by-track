import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type UserDocument = HydratedDocument<UserSchemaClass>;

/**
 * Resultado de leitura com `lean()` — objeto puro, sem os métodos do Document.
 * É o que o mapper consome: aceita tanto o lean quanto o hidratado.
 */
export type UserLean = UserSchemaClass;

@Schema({
  collection: 'users',
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
})
export class UserSchemaClass {
  /** Domínio gera o próprio id (UniqueEntityId, hex via kernel/object-id) — Mongo grava como ObjectId nativo. */
  @Prop({ type: SchemaTypes.ObjectId })
  _id!: Types.ObjectId;

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

  /** Único mecanismo de admin do produto — ver AdminSeederService (identity/infrastructure/seeders). */
  @Prop({
    type: String,
    enum: ['user', 'admin'],
    required: true,
    default: 'user',
  })
  role!: 'user' | 'admin';

  createdAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(UserSchemaClass);
