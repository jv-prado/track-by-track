import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export class AlbumTrack {
  @Prop({ type: String, required: true })
  spotifyId!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: Number, required: true })
  durationMs!: number;

  @Prop({ type: Number, required: true })
  trackNumber!: number;

  @Prop({ type: String })
  previewUrl?: string;
}

export type AlbumDocument = HydratedDocument<AlbumSchemaClass>;

@Schema({ collection: 'albums', timestamps: false, versionKey: false })
export class AlbumSchemaClass {
  @Prop({ type: SchemaTypes.ObjectId })
  _id!: Types.ObjectId;

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

  // Tag crua do Spotify (via artista) — fina demais pro filtro do usuário
  // ("classic rock", "sertanejo universitário"...). Guardada mesmo assim,
  // é a fonte de `curatedGenres` abaixo.
  @Prop({ type: [String], default: [] })
  genres!: string[];

  // `genres` mapeado pras 21 categorias amplas de `CURATED_GENRES` (ver
  // curated-genre-mapper.ts) — é este campo que o filtro de gênero do Top
  // Álbuns usa (discovery.service.ts), porque igualdade exata contra a tag
  // crua do Spotify quase nunca bate ("rock" ≠ "classic rock").
  @Prop({ type: [String], default: [], index: true })
  curatedGenres!: string[];

  @Prop({ type: Date, required: true })
  cachedAt!: Date;
}

export const AlbumSchema = SchemaFactory.createForClass(AlbumSchemaClass);
// Busca no que já está cacheado antes de gastar rate limit do Spotify (ver
// AlbumCatalogService.search). Peso maior no título: quem digita "nevermind"
// quer o álbum, não todo disco de um artista chamado Nevermind.
AlbumSchema.index(
  { name: 'text', artist: 'text' },
  { weights: { name: 3, artist: 1 }, name: 'album_text' },
);
