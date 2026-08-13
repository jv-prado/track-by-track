import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, type QueryFilter } from 'mongoose';
import { RankingSchemaClass } from '../ranking/infrastructure/persistence/ranking.schema';
import { AlbumSchemaClass } from '../album-catalog/album.schema';
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
import { decodeFeedCursor, encodeFeedCursor } from './feed-cursor';

export interface FeedItem {
  id: string;
  userId: string;
  userDisplayName: string;
  userAvatarUrl?: string;
  albumId: string;
  albumName: string;
  albumArtist: string;
  albumImageUrl?: string;
  averageScore: number;
  ratedTracks: number;
  totalTracks: number;
  /** ISO 8601 UTC — string na fronteira HTTP e no cache (seção 3 do CLAUDE.md). */
  createdAt: string;
}

export interface UserStats {
  total: number;
  averageScore: number;
  tracksRated: number;
}

export interface TopAlbumItem {
  albumId: string;
  albumName: string;
  albumArtist: string;
  albumImageUrl?: string;
  averageScore: number;
  ratingsCount: number;
}

export interface AlbumReviewItem {
  rankingId: string;
  userId: string;
  userDisplayName: string;
  userAvatarUrl?: string;
  reviewText: string | null;
  averageScore: number;
  createdAt: string;
}

export interface TrackTally {
  trackId: string;
  count: number;
}

export interface TrackTallyView {
  trackId: string;
  trackName: string;
  percentage: number;
}

export interface AlbumStats {
  albumId: string;
  averageScore: number;
  ratingsCount: number;
  topFavoriteTracks: TrackTallyView[];
  topWorstTracks: TrackTallyView[];
}

const FEED_JOIN_STAGES = [
  {
    $lookup: {
      from: 'albums',
      localField: 'albumId',
      foreignField: 'spotifyId',
      as: 'album',
    },
  },
  { $unwind: { path: '$album', preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: 'users',
      localField: 'userId',
      foreignField: '_id',
      as: 'user',
    },
  },
  { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
];

const FEED_PROJECT = {
  $project: {
    _id: 0,
    id: '$_id',
    userId: 1,
    userDisplayName: '$user.displayName',
    userAvatarUrl: '$user.avatarUrl',
    albumId: 1,
    albumName: '$album.name',
    albumArtist: '$album.artist',
    // Card do grid exibe ~210px: a capa de 300px basta e pesa ~1/4 da de 640px.
    // Fallback cobre álbum cacheado antes do backfill de `imageUrlSmall`.
    albumImageUrl: { $ifNull: ['$album.imageUrlSmall', '$album.imageUrl'] },
    averageScore: 1,
    // Faixa ignorada não conta como pendente nem como avaliada — mesmo critério
    // do `progress` calculado no agregado (album-ranking.aggregate.ts).
    totalTracks: {
      $size: {
        $filter: {
          input: '$entries',
          as: 'e',
          cond: { $ne: ['$$e.ignored', true] },
        },
      },
    },
    ratedTracks: {
      $size: {
        $filter: {
          input: '$entries',
          as: 'e',
          cond: {
            $and: [{ $ne: ['$$e.ignored', true] }, { $gt: ['$$e.score', 0] }],
          },
        },
      },
    },
    createdAt: { $dateToString: { date: '$createdAt' } },
  },
};

const FEED_LOOKUPS = [...FEED_JOIN_STAGES, FEED_PROJECT];

/** Ordenação estável: `_id` desempata `createdAt` igual e sustenta o cursor. */
const FEED_SORT = { createdAt: -1 as const, _id: -1 as const };

/** Escapa metacaracteres de regex — a busca é texto livre do usuário, nunca um padrão. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export type ByUserSort = 'recent' | 'score-desc' | 'score-asc';

const TOP_TRACKS_LIMIT = 3;

/**
 * Peso do prior na média bayesiana do Top Albums — quanto maior, mais rankings
 * completos um álbum precisa acumular antes que sua própria média pese mais
 * que a média global. Evita que 1-2 notas altas isoladas dominem o topo.
 */
const TOP_ALBUMS_BAYESIAN_C = 20;

// TTLs em segundos. Curto onde o usuário nota defasagem, longo onde a resposta
// só muda por mutação (que já dispara bump de versão).
const FEED_TTL = 60;
const FEED_TOTAL_TTL = 60;
const TOP_ALBUMS_TTL = 5 * 60;
const ALBUM_STATS_TTL = 10 * 60;
const ALBUM_REVIEWS_TTL = 5 * 60;
const USER_STATS_TTL = 5 * 60;
const USER_RANKINGS_TTL = 60;

@Injectable()
export class DiscoveryService {
  constructor(
    @InjectModel(RankingSchemaClass.name)
    private readonly rankingModel: Model<RankingSchemaClass>,
    @InjectModel(AlbumSchemaClass.name)
    private readonly albumModel: Model<AlbumSchemaClass>,
    @Inject(CACHE) private readonly cache: Cache,
    @Inject(CacheKeys) private readonly keys: CacheKeys,
  ) {}

  async feed(
    page: number,
    perPage: number,
    cursor?: string,
  ): Promise<Paginated<FeedItem>> {
    const version = await this.cache.version(this.keys.versionRankings());
    const key = cursor
      ? this.keys.feedCursor(version, cursor, perPage)
      : this.keys.feedPage(version, page, perPage);

    return this.cache.getOrSet(key, FEED_TTL, () =>
      this.loadFeed(version, page, perPage, cursor),
    );
  }

  private async loadFeed(
    version: number,
    page: number,
    perPage: number,
    cursor?: string,
  ): Promise<Paginated<FeedItem>> {
    // Feed público só mostra rankings completos — parcial ainda pode mudar muito
    // e polui a timeline de quem só quer ver avaliações "prontas".
    const baseFilter: QueryFilter<RankingSchemaClass> = {
      completedAt: { $ne: null },
    };

    const decoded = cursor ? decodeFeedCursor(cursor) : null;
    // Keyset em vez de $skip: página 100 custa o mesmo que a página 1.
    const filter: QueryFilter<RankingSchemaClass> = decoded
      ? {
          ...baseFilter,
          $or: [
            { createdAt: { $lt: decoded.createdAt } },
            { createdAt: decoded.createdAt, _id: { $lt: decoded.id } },
          ],
        }
      : baseFilter;

    const [data, total] = await Promise.all([
      this.rankingModel.aggregate<FeedItem>([
        { $match: filter },
        { $sort: FEED_SORT },
        // sem cursor a paginação segue por página (contrato antigo, ainda em uso)
        ...(decoded ? [] : [{ $skip: paginationSkip(page, perPage) }]),
        { $limit: perPage },
        ...FEED_LOOKUPS,
      ]),
      this.feedTotal(version, baseFilter),
    ]);

    const last = data[data.length - 1];
    const nextCursor =
      data.length === perPage && last
        ? encodeFeedCursor({ createdAt: new Date(last.createdAt), id: last.id })
        : null;

    return {
      data,
      meta: { ...buildPaginationMeta(page, perPage, total), nextCursor },
    };
  }

  /** `total` é o único pedaço O(n) que sobrou do feed — por isso vive em cache. */
  private feedTotal(
    version: number,
    filter: QueryFilter<RankingSchemaClass>,
  ): Promise<number> {
    return this.cache.getOrSet(
      this.keys.feedTotal(version),
      FEED_TOTAL_TTL,
      () => this.rankingModel.countDocuments(filter).exec(),
    );
  }

  async byUser(
    userId: string,
    page: number,
    perPage: number,
    search?: string,
    sort: ByUserSort = 'recent',
  ): Promise<Paginated<FeedItem>> {
    // Busca é texto livre: cardinalidade de chave sem teto, não entra em cache.
    if (search) return this.loadByUser(userId, page, perPage, search, sort);

    const version = await this.cache.version(this.keys.versionUser(userId));
    return this.cache.getOrSet(
      this.keys.userRankings(version, userId, sort, page, perPage),
      USER_RANKINGS_TTL,
      () => this.loadByUser(userId, page, perPage, undefined, sort),
    );
  }

  private async loadByUser(
    userId: string,
    page: number,
    perPage: number,
    search: string | undefined,
    sort: ByUserSort,
  ): Promise<Paginated<FeedItem>> {
    const sortStage: Record<string, 1 | -1> =
      sort === 'score-desc'
        ? { averageScore: -1 }
        : sort === 'score-asc'
          ? { averageScore: 1 }
          : { createdAt: -1 };

    const searchStage = search
      ? [
          {
            $match: {
              $or: [
                {
                  'album.name': { $regex: escapeRegex(search), $options: 'i' },
                },
                {
                  'album.artist': {
                    $regex: escapeRegex(search),
                    $options: 'i',
                  },
                },
              ],
            },
          },
        ]
      : [];

    const [result] = await this.rankingModel.aggregate<{
      data: FeedItem[];
      totalCount: { count: number }[];
    }>([
      { $match: { userId } },
      ...FEED_JOIN_STAGES,
      ...searchStage,
      {
        $facet: {
          data: [
            { $sort: sortStage },
            { $skip: paginationSkip(page, perPage) },
            { $limit: perPage },
            FEED_PROJECT,
          ],
          totalCount: [{ $count: 'count' }],
        },
      },
    ]);

    const data = result?.data ?? [];
    const total = result?.totalCount[0]?.count ?? 0;
    return { data, meta: buildPaginationMeta(page, perPage, total) };
  }

  async userStats(userId: string): Promise<UserStats> {
    const version = await this.cache.version(this.keys.versionUser(userId));
    return this.cache.getOrSet(
      this.keys.userStats(version, userId),
      USER_STATS_TTL,
      () => this.loadUserStats(userId),
    );
  }

  private async loadUserStats(userId: string): Promise<UserStats> {
    const [row] = await this.rankingModel.aggregate<{
      total: number;
      averageScore: number;
      tracksRated: number;
    }>([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          averageScore: { $avg: '$averageScore' },
          tracksRated: { $sum: { $size: '$entries' } },
        },
      },
    ]);
    return {
      total: row?.total ?? 0,
      averageScore: row ? Math.round(row.averageScore * 100) / 100 : 0,
      tracksRated: row?.tracksRated ?? 0,
    };
  }

  async topAlbums(
    page: number,
    perPage: number,
  ): Promise<Paginated<TopAlbumItem>> {
    const version = await this.cache.version(this.keys.versionRankings());
    return this.cache.getOrSet(
      this.keys.topAlbums(version, page, perPage),
      TOP_ALBUMS_TTL,
      () => this.loadTopAlbums(page, perPage),
    );
  }

  private async loadTopAlbums(
    page: number,
    perPage: number,
  ): Promise<Paginated<TopAlbumItem>> {
    // Só ranking completo entra na média pública — em progresso ainda tem faixa
    // sem nota (score 0), que puxaria a média do álbum pra baixo artificialmente.
    const completedFilter = { completedAt: { $ne: null } };

    const [globalAvgRow] = await this.rankingModel.aggregate<{ avg: number }>([
      { $match: completedFilter },
      { $group: { _id: null, avg: { $avg: '$averageScore' } } },
    ]);
    const globalAverage = globalAvgRow?.avg ?? 0;
    const c = TOP_ALBUMS_BAYESIAN_C;

    const [data, distinctAlbumIds] = await Promise.all([
      this.rankingModel.aggregate<TopAlbumItem>([
        { $match: completedFilter },
        {
          $group: {
            _id: '$albumId',
            averageScore: { $avg: '$averageScore' },
            ratingsCount: { $sum: 1 },
          },
        },
        {
          // Média bayesiana: pondera a média do álbum pelo volume de rankings
          // contra a média global — só ordena, não é o valor exibido.
          $addFields: {
            weightedScore: {
              $add: [
                {
                  $multiply: [
                    {
                      $divide: [
                        '$ratingsCount',
                        { $add: ['$ratingsCount', c] },
                      ],
                    },
                    '$averageScore',
                  ],
                },
                {
                  $multiply: [
                    { $divide: [c, { $add: ['$ratingsCount', c] }] },
                    globalAverage,
                  ],
                },
              ],
            },
          },
        },
        { $sort: { weightedScore: -1 } },
        { $skip: paginationSkip(page, perPage) },
        { $limit: perPage },
        {
          $lookup: {
            from: 'albums',
            localField: '_id',
            foreignField: 'spotifyId',
            as: 'album',
          },
        },
        { $unwind: { path: '$album', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            albumId: '$_id',
            albumName: '$album.name',
            albumArtist: '$album.artist',
            albumImageUrl: {
              $ifNull: ['$album.imageUrlSmall', '$album.imageUrl'],
            },
            averageScore: { $round: ['$averageScore', 2] },
            ratingsCount: 1,
          },
        },
      ]),
      this.rankingModel.distinct('albumId', completedFilter).exec(),
    ]);
    return {
      data,
      meta: buildPaginationMeta(page, perPage, distinctAlbumIds.length),
    };
  }

  async albumReviews(
    albumId: string,
    page: number,
    perPage: number,
  ): Promise<Paginated<AlbumReviewItem>> {
    const version = await this.cache.version(this.keys.versionAlbum(albumId));
    return this.cache.getOrSet(
      this.keys.albumReviews(version, albumId, page, perPage),
      ALBUM_REVIEWS_TTL,
      () => this.loadAlbumReviews(albumId, page, perPage),
    );
  }

  private async loadAlbumReviews(
    albumId: string,
    page: number,
    perPage: number,
  ): Promise<Paginated<AlbumReviewItem>> {
    const filter = {
      albumId,
      completedAt: { $ne: null },
    };
    const [data, total] = await Promise.all([
      this.rankingModel.aggregate<AlbumReviewItem>([
        { $match: filter },
        {
          $addFields: {
            hasReviewText: {
              $gt: [{ $strLenCP: { $ifNull: ['$review.text', ''] } }, 0],
            },
          },
        },
        { $sort: { hasReviewText: -1, updatedAt: -1 } },
        { $skip: paginationSkip(page, perPage) },
        { $limit: perPage },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            rankingId: '$_id',
            userId: 1,
            userDisplayName: '$user.displayName',
            userAvatarUrl: '$user.avatarUrl',
            reviewText: '$review.text',
            averageScore: 1,
            createdAt: { $dateToString: { date: '$createdAt' } },
          },
        },
      ]),
      this.rankingModel.countDocuments(filter).exec(),
    ]);
    return { data, meta: buildPaginationMeta(page, perPage, total) };
  }

  async albumStats(albumId: string): Promise<AlbumStats> {
    const version = await this.cache.version(this.keys.versionAlbum(albumId));
    return this.cache.getOrSet(
      this.keys.albumStats(version, albumId),
      ALBUM_STATS_TTL,
      () => this.loadAlbumStats(albumId),
    );
  }

  private async loadAlbumStats(albumId: string): Promise<AlbumStats> {
    const [summary, favoriteTally, worstTally, album] = await Promise.all([
      this.rankingModel
        .aggregate<{ averageScore: number; ratingsCount: number }>([
          { $match: { albumId, completedAt: { $ne: null } } },
          {
            $group: {
              _id: null,
              averageScore: { $avg: '$averageScore' },
              ratingsCount: { $sum: 1 },
            },
          },
        ])
        .then((rows) => rows[0] ?? { averageScore: 0, ratingsCount: 0 }),
      this.tallyTrackPicks(albumId, 'review.favoriteTrackId'),
      this.tallyTrackPicks(albumId, 'review.worstTrackId'),
      this.albumModel.findOne({ spotifyId: albumId }).lean().exec(),
    ]);

    const trackNameOf = (trackId: string) =>
      album?.tracks.find((track) => track.spotifyId === trackId)?.name ??
      trackId;

    const toView = (tally: TrackTally[]): TrackTallyView[] =>
      tally.map((entry) => ({
        trackId: entry.trackId,
        trackName: trackNameOf(entry.trackId),
        percentage:
          summary.ratingsCount === 0
            ? 0
            : Math.round((entry.count / summary.ratingsCount) * 100),
      }));

    return {
      albumId,
      averageScore: Math.round(summary.averageScore * 100) / 100,
      ratingsCount: summary.ratingsCount,
      topFavoriteTracks: toView(favoriteTally),
      topWorstTracks: toView(worstTally),
    };
  }

  private async tallyTrackPicks(
    albumId: string,
    field: string,
  ): Promise<TrackTally[]> {
    const rows = await this.rankingModel.aggregate<{
      _id: string;
      count: number;
    }>([
      {
        $match: {
          albumId,
          completedAt: { $ne: null },
          [field]: { $exists: true, $nin: [null, ''] },
        },
      },
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: TOP_TRACKS_LIMIT },
    ]);
    return rows.map((row) => ({ trackId: row._id, count: row.count }));
  }
}
