import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export class RankingEntrySchemaClass {
  @Prop({ type: String, required: true })
  trackId!: string;

  @Prop({ type: Number, required: true })
  trackNumber!: number;

  @Prop({ type: Number, required: true })
  score!: number;

  @Prop({ type: Number, required: true })
  position!: number;

  @Prop({ type: Boolean, default: false })
  ignored!: boolean;
}

export class ReviewSchemaClass {
  @Prop({ type: String })
  text?: string;

  @Prop({ type: String })
  favoriteTrackId?: string;

  @Prop({ type: String })
  worstTrackId?: string;
}

export type RankingDocument = HydratedDocument<RankingSchemaClass>;

@Schema({ collection: 'rankings', timestamps: false, versionKey: false })
export class RankingSchemaClass {
  @Prop({ type: String })
  _id!: string;

  @Prop({ type: String, required: true })
  userId!: string;

  @Prop({ type: String, required: true })
  albumId!: string;

  @Prop({ type: [RankingEntrySchemaClass], default: [] })
  entries!: RankingEntrySchemaClass[];

  @Prop({ type: Number, required: true })
  averageScore!: number;

  @Prop({ type: ReviewSchemaClass, default: {} })
  review!: ReviewSchemaClass;

  @Prop({ type: Date, default: null })
  firstCompletedAt!: Date | null;

  @Prop({ type: Date, default: null })
  completedAt!: Date | null;

  @Prop({ type: Date, required: true, index: true })
  createdAt!: Date;

  @Prop({ type: Date, required: true })
  updatedAt!: Date;
}

export const RankingSchema = SchemaFactory.createForClass(RankingSchemaClass);
// 1 ranking por usuário+álbum (invariante de domínio) — também serve de índice pra
// buscas só por userId (prefixo do compound), por isso não há um `userId: 1` solto.
RankingSchema.index({ userId: 1, albumId: 1 }, { unique: true });
// `byUser`/perfil público: filtra userId, ordena por createdAt desc.
RankingSchema.index({ userId: 1, createdAt: -1 });
// `albumReviews`: filtra albumId (+ review.text existir), ordena por updatedAt desc.
RankingSchema.index({ albumId: 1, updatedAt: -1 });
// feed público: filtra completedAt != null, ordena por createdAt desc.
RankingSchema.index({ completedAt: 1, createdAt: -1 });
