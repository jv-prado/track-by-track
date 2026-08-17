import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type ChartEntryDocument = HydratedDocument<ChartEntrySchemaClass>;

/**
 * Snapshot semanal de uma posição de chart externo (Billboard 200 hoje, outros
 * charts amanhã — daí `source`/`chart` como string solta em vez de enum: não
 * há um segundo valor ainda, ver CLAUDE.md §9 anti-metas). Nunca sobrescrito:
 * cada semana é um doc novo, é isso que sustenta o histórico (spec §14).
 */
@Schema({ collection: 'chart_entries', timestamps: true, versionKey: false })
export class ChartEntrySchemaClass {
  @Prop({ type: SchemaTypes.ObjectId })
  _id!: Types.ObjectId;

  @Prop({ type: String, required: true })
  source!: string;

  @Prop({ type: String, required: true })
  chart!: string;

  @Prop({ type: Date, required: true })
  chartDate!: Date;

  @Prop({ type: Number, required: true })
  rank!: number;

  @Prop({ type: Number })
  lastWeekRank?: number;

  @Prop({ type: Number })
  peakRank?: number;

  @Prop({ type: Number })
  weeksOnChart?: number;

  // spotifyId — chave natural externa, não `_id` do Mongo (mesma exceção de
  // `ranking.albumId`, CLAUDE.md §4.6). Ausente enquanto não resolvido.
  @Prop({ type: String })
  albumId?: string;

  @Prop({ type: String, enum: ['resolved', 'unresolved'], required: true })
  status!: 'resolved' | 'unresolved';

  // Snapshot cru da fonte, mantido mesmo depois de resolvido — é o que
  // alimenta o retry de item não resolvido (spec §27) sem rebuscar o chart.
  @Prop({ type: String, required: true })
  sourceName!: string;

  @Prop({ type: String, required: true })
  sourceArtist!: string;

  @Prop({ type: String })
  sourceImageUrl?: string;
}

export const ChartEntrySchema = SchemaFactory.createForClass(
  ChartEntrySchemaClass,
);

// Chave de upsert: reexecutar o sync da mesma semana atualiza o mesmo doc em
// vez de duplicar (spec §12/§14 — idempotência).
ChartEntrySchema.index(
  { source: 1, chart: 1, chartDate: 1, rank: 1 },
  { unique: true, name: 'chart_entry_upsert_key' },
);
// Histórico de um álbum específico (endpoint de detalhe do chart).
ChartEntrySchema.index(
  { albumId: 1, source: 1, chart: 1, chartDate: 1 },
  { name: 'chart_entry_album_history' },
);
// Semana mais recente de um chart (endpoint de listagem).
ChartEntrySchema.index(
  { source: 1, chart: 1, chartDate: 1 },
  { name: 'chart_entry_latest_week' },
);
