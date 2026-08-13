import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export class AlbumTrack {
  @Prop({ type: String, required: true })
  spotifyId!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: Number, required: true })
  durationMs!: number;

  @Prop({ type: Number, required: true })
  trackNumber!: number;
}

export type AlbumDocument = HydratedDocument<AlbumSchemaClass>;

@Schema({ collection: 'albums', timestamps: false, versionKey: false })
export class AlbumSchemaClass {
  @Prop({ type: String })
  _id!: string;

  @Prop({ type: String, required: true, unique: true, index: true })
  spotifyId!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, required: true })
  artist!: string;

  @Prop({ type: String })
  imageUrl?: string;

  @Prop({ type: String })
  imageUrlSmall?: string;

  @Prop({ type: String })
  releaseDate?: string;

  @Prop({ type: [AlbumTrack], default: [] })
  tracks!: AlbumTrack[];

  @Prop({ type: Date, required: true })
  cachedAt!: Date;
}

export const AlbumSchema = SchemaFactory.createForClass(AlbumSchemaClass);
