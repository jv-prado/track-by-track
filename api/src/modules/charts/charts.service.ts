import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChartEntrySchemaClass } from './chart-entry.schema';
import {
  BILLBOARD_200_CHART,
  BILLBOARD_SOURCE,
} from './billboard-sync.service';
import {
  Paginated,
  buildPaginationMeta,
  paginationSkip,
} from '../../shared/infrastructure/pagination';
import {
  CACHE,
  type Cache,
} from '../../shared/infrastructure/cache/cache.port';
import { CacheKeys } from '../../shared/infrastructure/cache/cache-keys';

export interface BillboardChartAlbum {
  /** `null` quando o item não foi resolvido pro catálogo — mostrado mesmo assim (spec do produto: a fonte já dá bastante informação sozinha). */
  albumId: string | null;
  albumName: string;
  albumArtist: string;
  albumImageUrl?: string | null;
  rank: number;
  lastWeekRank?: number;
  peakRank?: number;
  weeksOnChart?: number;
  chartDate: string;
  status: 'resolved' | 'unresolved';
  /** `null` enquanto ninguém do TBT avaliou o álbum ainda, ou quando `status` é `unresolved` (sem álbum pra avaliar) — nunca 0 forjado. */
  tbtScore: number | null;
  ratingsCount: number;
}

export interface BillboardHistoryEntry {
  chartDate: string;
  rank: number;
}

export interface BillboardHistory {
  albumId: string;
  currentRank: number | null;
  lastWeekRank: number | null;
  peakRank: number | null;
  weeksOnChart: number | null;
  history: BillboardHistoryEntry[];
}

/** Chart só muda no sync semanal — TTL curto é só pra não bater na aggregate a cada request. */
const BILLBOARD_CHART_TTL = 15 * 60;
const BILLBOARD_HISTORY_TTL = 15 * 60;

@Injectable()
export class ChartsService {
  constructor(
    @InjectModel(ChartEntrySchemaClass.name)
    private readonly chartEntryModel: Model<ChartEntrySchemaClass>,
    @Inject(CACHE) private readonly cache: Cache,
    @Inject(CacheKeys) private readonly keys: CacheKeys,
  ) {}

  billboard200(
    page: number,
    perPage: number,
  ): Promise<Paginated<BillboardChartAlbum>> {
    return this.cache.getOrSet(
      this.keys.billboardChart(page, perPage),
      BILLBOARD_CHART_TTL,
      () => this.loadBillboard200(page, perPage),
    );
  }

  private async loadBillboard200(
    page: number,
    perPage: number,
  ): Promise<Paginated<BillboardChartAlbum>> {
    const latest = await this.chartEntryModel
      .findOne({ source: BILLBOARD_SOURCE, chart: BILLBOARD_200_CHART })
      .sort({ chartDate: -1 })
      .lean()
      .exec();
    if (!latest)
      return { data: [], meta: buildPaginationMeta(page, perPage, 0) };

    // Mostra `unresolved` também — a fonte já dá nome/artista/capa/posição
    // sozinha, e ficar sem álbum vinculado não some com essa informação. O
    // que falta (TBT score, link de ranking) fica indisponível pro frontend
    // decidir como exibir, spotifyId nunca é forjado (spec §27).
    const filter = {
      source: BILLBOARD_SOURCE,
      chart: BILLBOARD_200_CHART,
      chartDate: latest.chartDate,
    };

    const [data, total] = await Promise.all([
      this.chartEntryModel.aggregate<BillboardChartAlbum>([
        { $match: filter },
        { $sort: { rank: 1 } },
        { $skip: paginationSkip(page, perPage) },
        { $limit: perPage },
        {
          $lookup: {
            from: 'albums',
            localField: 'albumId',
            foreignField: 'spotifyId',
            as: 'album',
          },
        },
        { $unwind: { path: '$album', preserveNullAndEmptyArrays: true } },
        // Média/contagem do TBT num único aggregate — mesma regra de "$lookup
        // explícito, nunca populate em listagem" do CLAUDE.md §4.6.
        {
          $lookup: {
            from: 'rankings',
            let: { albumId: '$albumId' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$albumId', '$$albumId'] },
                  completedAt: { $ne: null },
                },
              },
              {
                $group: {
                  _id: null,
                  avg: { $avg: '$averageScore' },
                  count: { $sum: 1 },
                },
              },
            ],
            as: 'ratings',
          },
        },
        { $unwind: { path: '$ratings', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            // sem álbum resolvido, `albumId` explícito `null` — nunca omitido
            // (o frontend decide o que mostrar a partir dele, nunca infere de campo ausente).
            albumId: { $ifNull: ['$albumId', null] },
            // snapshot da fonte é o fallback: item unresolved não tem `$album`
            // (lookup vazio), mas a fonte já manda nome/artista/capa sozinha.
            albumName: { $ifNull: ['$album.name', '$sourceName'] },
            albumArtist: { $ifNull: ['$album.artist', '$sourceArtist'] },
            albumImageUrl: {
              $ifNull: [
                '$album.imageUrlSmall',
                { $ifNull: ['$album.imageUrl', '$sourceImageUrl'] },
              ],
            },
            rank: 1,
            lastWeekRank: 1,
            peakRank: 1,
            weeksOnChart: 1,
            chartDate: {
              $dateToString: { date: '$chartDate', format: '%Y-%m-%d' },
            },
            status: 1,
            tbtScore: {
              $cond: [
                { $ifNull: ['$ratings.avg', false] },
                { $round: ['$ratings.avg', 2] },
                null,
              ],
            },
            ratingsCount: { $ifNull: ['$ratings.count', 0] },
          },
        },
      ]),
      this.chartEntryModel.countDocuments(filter).exec(),
    ]);

    return { data, meta: buildPaginationMeta(page, perPage, total) };
  }

  billboardHistory(albumId: string): Promise<BillboardHistory> {
    return this.cache.getOrSet(
      this.keys.billboardHistory(albumId),
      BILLBOARD_HISTORY_TTL,
      () => this.loadBillboardHistory(albumId),
    );
  }

  private async loadBillboardHistory(
    albumId: string,
  ): Promise<BillboardHistory> {
    const entries = await this.chartEntryModel
      .find({
        source: BILLBOARD_SOURCE,
        chart: BILLBOARD_200_CHART,
        albumId,
        status: 'resolved',
      })
      .sort({ chartDate: 1 })
      .lean()
      .exec();

    if (entries.length === 0) {
      return {
        albumId,
        currentRank: null,
        lastWeekRank: null,
        peakRank: null,
        weeksOnChart: null,
        history: [],
      };
    }

    const latest = entries[entries.length - 1]!;
    const peakRank = Math.min(
      ...entries.map((entry) => entry.peakRank ?? entry.rank),
    );

    return {
      albumId,
      currentRank: latest.rank,
      lastWeekRank: latest.lastWeekRank ?? null,
      peakRank,
      weeksOnChart: latest.weeksOnChart ?? null,
      history: entries.map((entry) => ({
        chartDate: entry.chartDate.toISOString().slice(0, 10),
        rank: entry.rank,
      })),
    };
  }
}
