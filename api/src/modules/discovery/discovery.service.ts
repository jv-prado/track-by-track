import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, type QueryFilter } from 'mongoose';
import { RankingSchemaClass } from '../ranking/infrastructure/persistence/ranking.schema';
import { AlbumSchemaClass } from '../album-catalog/album.schema';
import { AlbumCatalogService } from '../album-catalog/album-catalog.service';
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
import { FollowsService } from '../follows/follows.service';

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
  /** Critério de ordenação do feed (ver FEED_SORT) — bump em edição real, não em touch trivial. */
  updatedAt: string;
  /** `null` fora da janela de 24h — sem isso todo item editado uma vez vira "Atualizado" pra sempre. */
  badge: 'new' | 'updated' | null;
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

export interface LastEditedAlbum {
  albumId: string;
  albumName: string;
  albumArtist: string;
  albumImageUrl?: string;
  averageScore: number;
  progress: { rated: number; total: number; percentage: number };
  updatedAt: string;
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

/**
 * Faixa ignorada não conta como avaliada — mesmo critério do `progress`
 * calculado no agregado (album-ranking.aggregate.ts). Reaproveitado no
 * projection do feed, no filtro de "ranking com conteúdo" e nas stats do
 * usuário — um só lugar decidindo o que é "faixa avaliada" nas três leituras.
 */
const RATED_TRACKS_EXPR = {
  $size: {
    $filter: {
      input: '$entries',
      as: 'e',
      cond: {
        $and: [{ $ne: ['$$e.ignored', true] }, { $gt: ['$$e.score', 0] }],
      },
    },
  },
};

/**
 * Ranking sem nenhuma faixa avaliada é rascunho vazio (aberto na página do
 * álbum, nunca avaliado) — `persist-ranking.ts` já limpa isso do banco a
 * cada mutação, mas um ranking criado e nunca mais tocado ainda pode existir.
 * Filtra aqui pra listagem/estatística nunca contar isso como "álbum
 * avaliado" mesmo antes da limpeza retroativa.
 */
const HAS_RATED_TRACK_MATCH = {
  $expr: { $gt: [RATED_TRACKS_EXPR, 0] },
};

/** Faixa ignorada não conta como pendente nem como avaliada — mesmo critério acima. */
const TOTAL_TRACKS_EXPR = {
  $size: {
    $filter: {
      input: '$entries',
      as: 'e',
      cond: { $ne: ['$$e.ignored', true] },
    },
  },
};

/** Separado do join de usuário: filtro por gênero só precisa deste (ver `countFeed`). */
const ALBUM_JOIN_STAGES = [
  {
    $lookup: {
      from: 'albums',
      localField: 'albumId',
      foreignField: 'spotifyId',
      as: 'album',
    },
  },
  { $unwind: { path: '$album', preserveNullAndEmptyArrays: true } },
];

const USER_JOIN_STAGES = [
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

const FEED_JOIN_STAGES = [...ALBUM_JOIN_STAGES, ...USER_JOIN_STAGES];

/** Fora dessa janela a partir de `createdAt`/`updatedAt`, item não carrega tag — senão qualquer edição antiga vira "Atualizado" pra sempre. */
const FEED_BADGE_WINDOW_MS = 24 * 60 * 60 * 1000;

// `$$NOW` é o instante da execução da query — não do momento em que a resposta
// cacheada foi lida, então a tag fica só até no máximo FEED_TTL (60s) defasada
// do relógio real, negligível contra uma janela de 24h.
const BADGE_EXPR = {
  $switch: {
    branches: [
      {
        case: {
          $lt: [{ $subtract: ['$$NOW', '$createdAt'] }, FEED_BADGE_WINDOW_MS],
        },
        then: 'new',
      },
      {
        case: {
          $and: [
            { $gt: ['$updatedAt', '$createdAt'] },
            {
              $lt: [
                { $subtract: ['$$NOW', '$updatedAt'] },
                FEED_BADGE_WINDOW_MS,
              ],
            },
          ],
        },
        then: 'updated',
      },
    ],
    default: null,
  },
};

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
    totalTracks: TOTAL_TRACKS_EXPR,
    ratedTracks: RATED_TRACKS_EXPR,
    badge: BADGE_EXPR,
    createdAt: { $dateToString: { date: '$createdAt' } },
    updatedAt: { $dateToString: { date: '$updatedAt' } },
  },
};

const FEED_LOOKUPS = [...FEED_JOIN_STAGES, FEED_PROJECT];

// `updatedAt`, não `createdAt`: review editada (nota ou texto) precisa subir de
// volta pro topo do feed, senão a tag "Atualizado" fica enterrada na posição de
// criação e ninguém rola até lá pra ver (mesmo critério já usado em albumReviews).
// `updatedAt` == `createdAt` no momento da criação, então item novo também ordena certo.
/** Ordenação estável: `_id` desempata `updatedAt` igual e sustenta o cursor. */
const FEED_SORT = { updatedAt: -1 as const, _id: -1 as const };

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
const LAST_EDITED_ALBUM_TTL = 60;

@Injectable()
export class DiscoveryService {
  constructor(
    @InjectModel(RankingSchemaClass.name)
    private readonly rankingModel: Model<RankingSchemaClass>,
    @InjectModel(AlbumSchemaClass.name)
    private readonly albumModel: Model<AlbumSchemaClass>,
    @Inject(CACHE) private readonly cache: Cache,
    @Inject(CacheKeys) private readonly keys: CacheKeys,
    private readonly albumCatalog: AlbumCatalogService,
    @Inject(FollowsService) private readonly follows: FollowsService,
  ) {}

  /**
   * `$lookup` só acha álbum já cacheado em `albums`. Ranking migrado (fase 7) ou
   * criado antes do usuário abrir a tela de álbum referencia um `albumId` que
   * ainda não passou pelo Album Catalog — sem isso a capa fica presa no
   * placeholder pra sempre. Busca sob demanda e escreve no cache Mongo, então a
   * próxima leitura já resolve pelo `$lookup` direto.
   */
  private async resolveMissingAlbums<
    T extends {
      albumId: string;
      albumName: string;
      albumArtist: string;
      albumImageUrl?: string;
    },
  >(items: T[]): Promise<void> {
    const missingIds = [
      ...new Set(
        items.filter((item) => !item.albumName).map((item) => item.albumId),
      ),
    ];
    if (missingIds.length === 0) return;

    const resolved = await Promise.all(
      missingIds.map((id) => this.albumCatalog.getAlbum(id).catch(() => null)),
    );
    const byId = new Map(missingIds.map((id, i) => [id, resolved[i]]));

    for (const item of items) {
      if (item.albumName) continue;
      const album = byId.get(item.albumId);
      if (!album) continue;
      item.albumName = album.name;
      item.albumArtist = album.artist;
      item.albumImageUrl = album.imageUrlSmall ?? album.imageUrl;
    }
  }

  async feed(
    page: number,
    perPage: number,
    cursor?: string,
    genre?: string,
  ): Promise<Paginated<FeedItem>> {
    const version = await this.cache.version(this.keys.versionRankings());
    const key = cursor
      ? this.keys.feedCursor(version, cursor, perPage, genre)
      : this.keys.feedPage(version, page, perPage, genre);

    return this.cache.getOrSet(key, FEED_TTL, () =>
      this.loadFeed(version, page, perPage, cursor, undefined, genre),
    );
  }

  /**
   * Feed de quem o usuário segue. **Sem cache de propósito:** a chave teria que
   * incluir o usuário, e a cardinalidade cresce com a base inteira — cachear
   * isso é assunto da Fase 5 do docs/CACHE-REDIS.md, não deste caminho.
   *
   * Sem ninguém seguido devolve página vazia em vez de cair pro global: o feed
   * pessoal vazio é informação (a UI oferece "descobrir gente pra seguir"),
   * enquanto o fallback silencioso faria o usuário achar que está seguindo alguém.
   */
  async followingFeed(
    userId: string,
    page: number,
    perPage: number,
    cursor?: string,
    genre?: string,
  ): Promise<Paginated<FeedItem>> {
    const followeeIds = await this.follows.followeeIds(userId);
    if (followeeIds.length === 0) {
      return {
        data: [],
        meta: { ...buildPaginationMeta(page, perPage, 0), nextCursor: null },
      };
    }
    return this.loadFeed(
      0,
      page,
      perPage,
      cursor,
      { userId: { $in: followeeIds } },
      genre,
    );
  }

  private async loadFeed(
    version: number,
    page: number,
    perPage: number,
    cursor?: string,
    extraMatch?: QueryFilter<RankingSchemaClass>,
    genre?: string,
  ): Promise<Paginated<FeedItem>> {
    // Feed público só mostra rankings completos — parcial ainda pode mudar muito
    // e polui a timeline de quem só quer ver avaliações "prontas".
    const baseFilter: QueryFilter<RankingSchemaClass> = {
      completedAt: { $ne: null },
      ...extraMatch,
    };

    const decoded = cursor ? decodeFeedCursor(cursor) : null;
    // Keyset em vez de $skip: página 100 custa o mesmo que a página 1.
    const filter: QueryFilter<RankingSchemaClass> = decoded
      ? {
          ...baseFilter,
          $or: [
            { updatedAt: { $lt: decoded.sortAt } },
            { updatedAt: decoded.sortAt, _id: { $lt: decoded.id } },
          ],
        }
      : baseFilter;

    const skipStage = decoded ? [] : [{ $skip: paginationSkip(page, perPage) }];
    // Gênero mora no álbum (`albums.curatedGenres`), não no ranking: precisa do
    // `$lookup` antes de filtrar, então skip/limit também migram pra depois do
    // join — perde o "skip pelo índice" que o caminho sem gênero tem, mesmo
    // trade-off que loadByUser/loadTopAlbums já aceitam pra filtro de gênero.
    const pipeline = genre
      ? [
          { $match: filter },
          { $sort: FEED_SORT },
          ...ALBUM_JOIN_STAGES,
          { $match: { 'album.curatedGenres': genre } },
          ...skipStage,
          { $limit: perPage },
          ...USER_JOIN_STAGES,
          FEED_PROJECT,
        ]
      : [
          { $match: filter },
          { $sort: FEED_SORT },
          ...skipStage,
          { $limit: perPage },
          ...FEED_LOOKUPS,
        ];

    const [data, total] = await Promise.all([
      this.rankingModel.aggregate<FeedItem>(pipeline),
      // Feed personalizado (following) ou filtrado (gênero) conta direto: a
      // chave do total cacheado por versão devolveria o total de outro escopo.
      extraMatch
        ? this.countFeed(baseFilter, genre)
        : this.feedTotal(version, baseFilter, genre),
    ]);

    await this.resolveMissingAlbums(data);

    const last = data[data.length - 1];
    const nextCursor =
      data.length === perPage && last
        ? encodeFeedCursor({ sortAt: new Date(last.updatedAt), id: last.id })
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
    genre?: string,
  ): Promise<number> {
    return this.cache.getOrSet(
      this.keys.feedTotal(version, genre),
      FEED_TOTAL_TTL,
      () => this.countFeed(filter, genre),
    );
  }

  /** Sem gênero, count direto usa o índice `(completedAt, updatedAt)`. Com gênero, precisa do `$lookup` do álbum primeiro. */
  private async countFeed(
    filter: QueryFilter<RankingSchemaClass>,
    genre?: string,
  ): Promise<number> {
    if (!genre) return this.rankingModel.countDocuments(filter).exec();

    const [row] = await this.rankingModel.aggregate<{ count: number }>([
      { $match: filter },
      ...ALBUM_JOIN_STAGES,
      { $match: { 'album.curatedGenres': genre } },
      { $count: 'count' },
    ]);
    return row?.count ?? 0;
  }

  async byUser(
    userId: string,
    page: number,
    perPage: number,
    search?: string,
    sort: ByUserSort = 'recent',
    genre?: string,
  ): Promise<Paginated<FeedItem>> {
    // Busca é texto livre: cardinalidade de chave sem teto, não entra em cache.
    if (search)
      return this.loadByUser(userId, page, perPage, search, sort, genre);

    const version = await this.cache.version(this.keys.versionUser(userId));
    return this.cache.getOrSet(
      this.keys.userRankings(version, userId, sort, page, perPage, genre),
      USER_RANKINGS_TTL,
      () => this.loadByUser(userId, page, perPage, undefined, sort, genre),
    );
  }

  private async loadByUser(
    userId: string,
    page: number,
    perPage: number,
    search: string | undefined,
    sort: ByUserSort,
    genre?: string,
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

    // `album` já vem desenrolado pelo $unwind de FEED_JOIN_STAGES — dá pra
    // casar direto contra `curatedGenres` (ver curated-genre-mapper.ts).
    const genreStage = genre
      ? [{ $match: { 'album.curatedGenres': genre } }]
      : [];

    const [result] = await this.rankingModel.aggregate<{
      data: FeedItem[];
      totalCount: { count: number }[];
    }>([
      { $match: { userId, ...HAS_RATED_TRACK_MATCH } },
      ...FEED_JOIN_STAGES,
      ...searchStage,
      ...genreStage,
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

    await this.resolveMissingAlbums(data);

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
      { $match: { userId, ...HAS_RATED_TRACK_MATCH } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          averageScore: { $avg: '$averageScore' },
          tracksRated: { $sum: RATED_TRACKS_EXPR },
        },
      },
    ]);
    return {
      total: row?.total ?? 0,
      averageScore: row ? Math.round(row.averageScore * 100) / 100 : 0,
      tracksRated: row?.tracksRated ?? 0,
    };
  }

  /** Álbum onde o usuário mexeu por último — link de acesso rápido na sidebar. */
  async lastEditedAlbum(userId: string): Promise<LastEditedAlbum | null> {
    const version = await this.cache.version(this.keys.versionUser(userId));
    return this.cache.getOrSet(
      this.keys.lastEditedAlbum(version, userId),
      LAST_EDITED_ALBUM_TTL,
      () => this.loadLastEditedAlbum(userId),
    );
  }

  private async loadLastEditedAlbum(
    userId: string,
  ): Promise<LastEditedAlbum | null> {
    // HAS_RATED_TRACK_MATCH: rascunho sem faixa avaliada não conta como "editado"
    // (mesmo critério de userStats/byUser) — mesmo que persist-ranking.ts já
    // apague esse caso do banco a cada mutação, dado migrado pode não ter passado
    // por lá ainda.
    const [row] = await this.rankingModel.aggregate<LastEditedAlbum>([
      { $match: { userId, ...HAS_RATED_TRACK_MATCH } },
      { $sort: { updatedAt: -1 } },
      { $limit: 1 },
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
        $project: {
          _id: 0,
          albumId: 1,
          albumName: '$album.name',
          albumArtist: '$album.artist',
          albumImageUrl: {
            $ifNull: ['$album.imageUrlSmall', '$album.imageUrl'],
          },
          // Mesma fórmula de averageScore/progress do agregado (album-ranking.aggregate.ts) —
          // servidor é a única fonte, aqui só reprojetada pra evitar hidratar o domínio inteiro.
          averageScore: { $round: ['$averageScore', 2] },
          progress: {
            rated: RATED_TRACKS_EXPR,
            total: TOTAL_TRACKS_EXPR,
            percentage: {
              $cond: [
                { $eq: [TOTAL_TRACKS_EXPR, 0] },
                0,
                {
                  $round: [
                    {
                      $multiply: [
                        { $divide: [RATED_TRACKS_EXPR, TOTAL_TRACKS_EXPR] },
                        100,
                      ],
                    },
                    0,
                  ],
                },
              ],
            },
          },
          updatedAt: { $dateToString: { date: '$updatedAt' } },
        },
      },
    ]);
    if (!row) return null;

    await this.resolveMissingAlbums([row]);
    return row;
  }

  async topAlbums(
    page: number,
    perPage: number,
    genre?: string,
  ): Promise<Paginated<TopAlbumItem>> {
    const version = await this.cache.version(this.keys.versionRankings());
    return this.cache.getOrSet(
      this.keys.topAlbums(version, page, perPage, genre),
      TOP_ALBUMS_TTL,
      () => this.loadTopAlbums(page, perPage, genre),
    );
  }

  private async loadTopAlbums(
    page: number,
    perPage: number,
    genre?: string,
  ): Promise<Paginated<TopAlbumItem>> {
    // Só ranking completo entra na média pública — em progresso ainda tem faixa
    // sem nota (score 0), que puxaria a média do álbum pra baixo artificialmente.
    const completedFilter = { completedAt: { $ne: null } };
    // Gênero mora no álbum (`albums.genres`), não no ranking — precisa do
    // $lookup antes de agrupar, senão a paginação conta rankings errados.
    const genreStages = genre
      ? [
          {
            $lookup: {
              from: 'albums',
              localField: 'albumId',
              foreignField: 'spotifyId',
              as: 'genreLookup',
            },
          },
          // `genres` é a tag crua do Spotify ("classic rock") — igualdade exata
          // contra ela quase nunca bate. `curatedGenres` é a mesma tag já
          // mapeada pras 21 categorias do filtro (curated-genre-mapper.ts).
          { $match: { 'genreLookup.curatedGenres': genre } },
        ]
      : [];

    const [globalAvgRow] = await this.rankingModel.aggregate<{ avg: number }>([
      { $match: completedFilter },
      { $group: { _id: null, avg: { $avg: '$averageScore' } } },
    ]);
    const globalAverage = globalAvgRow?.avg ?? 0;
    const c = TOP_ALBUMS_BAYESIAN_C;

    const [data, distinctAlbumIds] = await Promise.all([
      this.rankingModel.aggregate<TopAlbumItem>([
        { $match: completedFilter },
        ...genreStages,
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
      genre
        ? this.rankingModel
            .aggregate<{ _id: string }>([
              { $match: completedFilter },
              ...genreStages,
              { $group: { _id: '$albumId' } },
            ])
            .then((rows) => rows.map((row) => row._id))
        : this.rankingModel.distinct('albumId', completedFilter).exec(),
    ]);

    await this.resolveMissingAlbums(data);

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
