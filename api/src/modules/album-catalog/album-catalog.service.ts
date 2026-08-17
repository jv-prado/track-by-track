import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SpotifyClientService } from './spotify-client.service';
import { ItunesPreviewService } from './itunes-preview.service';
import {
  AppleTopAlbumsService,
  type ChartAlbumRaw,
} from './apple-top-albums.service';
import { mapToCuratedGenres } from './curated-genre-mapper';
import { AlbumSchemaClass } from './album.schema';
import { newObjectId } from '../../shared/kernel/object-id';
import { AlbumDetail, AlbumSummary, RecentRelease } from './spotify-normalizer';
import type { CuratedGenre } from './genres.constant';
import {
  CACHE,
  type Cache,
} from '../../shared/infrastructure/cache/cache.port';
import { CacheKeys } from '../../shared/infrastructure/cache/cache-keys';

/** Catálogo do Spotify muda raramente — cache de 7 dias evita bater na API à toa. */
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Busca custa ~600ms no Spotify e o resultado é praticamente imóvel. */
const SEARCH_TTL_SECONDS = 24 * 60 * 60;
/**
 * Negative cache: responder "não existe" custava um round-trip inteiro ao
 * Spotify. TTL curto porque um ID pode passar a existir (álbum recém-lançado).
 */
const MISSING_TTL_SECONDS = 60 * 60;
/** Prévia resolvida sob demanda (por clique) — cacheia acerto e miss por 24h. */
const PREVIEW_TTL_SECONDS = 24 * 60 * 60;
/** Chart da Apple muda ~1x/dia — 12h evita rebuscar as lojas à toa. */
const CHART_TTL_SECONDS = 12 * 60 * 60;
/** Lançamentos mudam ~1x/dia (releases semanais concentradas) e custam 20 buscas. */
const NEW_RELEASES_TTL_SECONDS = 12 * 60 * 60;
/**
 * Resolve a página do chart contra o Spotify em lotes. Medido contra a API
 * real: 15 em paralelo passa sem 429, 25 leva rate limit em metade das
 * chamadas — e requisição limitada vira item descartado da lista.
 */
const CHART_RESOLVE_BATCH_SIZE = 12;

/**
 * Fatias mínimas das dependências, no mesmo espírito do `SpotifyCredentialsConfig`:
 * o teste implementa a interface em vez de castar um mock para a classe concreta
 * (`as unknown as` é proibido — seção 1 do CLAUDE.md).
 */
export interface AlbumCatalogSpotify {
  searchAlbums(
    query: string,
    limit: number,
    offset: number,
  ): Promise<{ items: AlbumSummary[]; total: number }>;
  getAlbumWithTracks(spotifyId: string): Promise<AlbumDetail | null>;
  getRecentReleases(): Promise<RecentRelease[]>;
}

/** Lançamento com gênero já reduzido às categorias curadas — o que o filtro usa. */
export interface NewReleaseAlbum extends AlbumSummary {
  genres: CuratedGenre[];
}

/**
 * Ordem do select de gênero: quem tem mais álbum vem primeiro. Em ordem
 * alfabética "rock" caía no fim da lista enquanto "children's music", com três
 * itens, abria o menu — o filtro que interessa tem que estar à vista.
 * Alfabético só desempata, pra ordem não dançar entre dois recarregamentos.
 */
function byFrequency<T extends string>(values: T[]): T[] {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);

  return [...counts.entries()]
    .sort(([aName, aCount], [bName, bCount]) =>
      bCount === aCount ? aName.localeCompare(bName) : bCount - aCount,
    )
    .map(([name]) => name);
}

function toNewReleaseAlbum(release: RecentRelease): NewReleaseAlbum {
  return {
    spotifyId: release.spotifyId,
    name: release.name,
    artist: release.artist,
    imageUrl: release.imageUrl,
    imageUrlSmall: release.imageUrlSmall,
    releaseDate: release.releaseDate,
    // tag crua do Spotify já mapeada aqui: o filtro compara contra as 21
    // categorias, nunca contra "sertanejo universitário".
    genres: mapToCuratedGenres(release.genres),
  };
}

export interface AlbumCatalogAppleCharts {
  fetchChart(): Promise<ChartAlbumRaw[]>;
}

export interface ChartAlbum {
  spotifyId: string;
  /** Posição no chart cheio da Apple (união das lojas), 1-indexado — não muda com filtro de gênero. */
  rank: number;
  name: string;
  artist: string;
  imageUrl?: string;
  releaseDate?: string;
  genres: string[];
}

export interface AlbumCatalogPreviewSource {
  fetchPreview(artist: string, trackName: string): Promise<string | undefined>;
}

export interface AlbumStore {
  findOne(filter: { spotifyId: string }): {
    lean(): { exec(): Promise<AlbumSchemaClass | null> };
  };
  find(
    filter: Record<string, unknown>,
    projection?: Record<string, unknown>,
  ): {
    sort(sort: Record<string, unknown>): {
      limit(limit: number): {
        lean(): { exec(): Promise<AlbumSchemaClass[]> };
      };
    };
  };
  updateOne(
    filter: { spotifyId: string },
    update: Record<string, unknown>,
    options: { upsert: boolean },
  ): unknown;
}

@Injectable()
export class AlbumCatalogService {
  constructor(
    @Inject(SpotifyClientService)
    private readonly spotify: AlbumCatalogSpotify,
    @Inject(ItunesPreviewService)
    private readonly previewSource: AlbumCatalogPreviewSource,
    @Inject(AppleTopAlbumsService)
    private readonly appleCharts: AlbumCatalogAppleCharts,
    @InjectModel(AlbumSchemaClass.name)
    private readonly albumModel: AlbumStore,
    @Inject(CACHE) private readonly cache: Cache,
    @Inject(CacheKeys) private readonly keys: CacheKeys,
  ) {}

  /**
   * Tenta o catálogo já cacheado antes do Spotify: busca repetida por álbum que
   * alguém já abriu (ou já buscou) não gasta round-trip nem cota de rate limit.
   *
   * Só a primeira página consulta o local. Da segunda em diante o Spotify é a
   * única fonte — misturar as duas paginações repetiria e puloria itens, já que
   * o `total` local não tem relação com o do Spotify.
   */
  async search(
    query: string,
    limit: number,
    offset: number,
  ): Promise<{ items: AlbumSummary[]; total: number }> {
    if (offset === 0) {
      const local = await this.searchLocal(query, limit);
      if (local.length >= limit) {
        return { items: local, total: local.length };
      }
    }

    return this.searchSpotify(query, limit, offset);
  }

  /**
   * Busca no Spotify sem o atalho de catálogo local do `search()`. O índice
   * de texto do Mongo (`$text`) casa qualquer termo em comum — "Drake Take
   * Care" bate em "Boy Harsher · Careful" só por "care" — bom o suficiente
   * pra usuário digitando numa caixa de busca, ruim pra resolução de chart
   * externo (Billboard etc), que precisa do candidato certo, não de "algo
   * parecido" (confirmado na prática: 1ª leva do sync do Billboard rejeitou
   * lixo do índice local achando que era "sem correspondência no Spotify").
   * Usado por `ChartResolverService`.
   */
  searchSpotifyOnly(
    query: string,
    limit: number,
  ): Promise<{ items: AlbumSummary[]; total: number }> {
    return this.searchSpotify(query, limit, 0);
  }

  // O upsert vive dentro do factory: em cache hit não há resultado novo pra
  // aprender, e reescrever os mesmos docs a cada busca repetida seria escrita à toa.
  private searchSpotify(
    query: string,
    limit: number,
    offset: number,
  ): Promise<{ items: AlbumSummary[]; total: number }> {
    return this.cache.getOrSet(
      this.keys.spotifySearch(query, limit, offset),
      SEARCH_TTL_SECONDS,
      async () => {
        const result = await this.spotify.searchAlbums(query, limit, offset);
        await this.rememberSearchResults(result.items);
        return result;
      },
    );
  }

  private async searchLocal(
    query: string,
    limit: number,
  ): Promise<AlbumSummary[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const docs = await this.albumModel
      .find({ $text: { $search: trimmed } }, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .lean()
      .exec();

    return docs.map((doc) => ({
      spotifyId: doc.spotifyId,
      name: doc.name,
      artist: doc.artist,
      imageUrl: doc.imageUrl,
      imageUrlSmall: doc.imageUrlSmall,
      releaseDate: doc.releaseDate,
    }));
  }

  /**
   * Resultado de busca alimenta o catálogo — sem isto o índice de texto só
   * conheceria álbum que alguém abriu, e a busca local quase nunca acertaria.
   *
   * `cachedAt: new Date(0)` no insert não é detalhe cosmético: o doc que nasce
   * aqui **não tem faixas**. Com data de agora, `getAlbum` o consideraria fresco
   * e devolveria um álbum sem faixa nenhuma — quebrando a criação de ranking.
   * Com epoch ele nasce stale e o primeiro `getAlbum` busca o álbum completo.
   * O `$set` nunca toca `tracks`, então doc já completo não é degradado.
   */
  private async rememberSearchResults(items: AlbumSummary[]): Promise<void> {
    await Promise.all(
      items.map((item) =>
        this.albumModel.updateOne(
          { spotifyId: item.spotifyId },
          {
            $set: {
              name: item.name,
              artist: item.artist,
              imageUrl: item.imageUrl,
              imageUrlSmall: item.imageUrlSmall,
              releaseDate: item.releaseDate,
            },
            $setOnInsert: {
              _id: newObjectId(),
              spotifyId: item.spotifyId,
              tracks: [],
              genres: [],
              curatedGenres: [],
              cachedAt: new Date(0),
            },
          },
          { upsert: true },
        ),
      ),
    );
  }

  async getAlbum(spotifyId: string): Promise<AlbumDetail | null> {
    const cached = await this.albumModel.findOne({ spotifyId }).lean().exec();
    if (cached && Date.now() - cached.cachedAt.getTime() < CACHE_TTL_MS) {
      return {
        spotifyId: cached.spotifyId,
        name: cached.name,
        artist: cached.artist,
        imageUrl: cached.imageUrl,
        imageUrlSmall: cached.imageUrlSmall,
        releaseDate: cached.releaseDate,
        tracks: cached.tracks,
        // doc cacheado antes do backfill de gênero não tem o campo ainda.
        genres: cached.genres ?? [],
      };
    }

    const missingKey = this.keys.spotifyAlbumMissing(spotifyId);
    if (await this.cache.get<boolean>(missingKey)) return null;

    const album = await this.spotify.getAlbumWithTracks(spotifyId);
    if (!album) {
      await this.cache.set(missingKey, true, MISSING_TTL_SECONDS);
      return null;
    }

    await this.albumModel.updateOne(
      { spotifyId },
      {
        $set: {
          ...album,
          // tag crua do Spotify ("classic rock") mapeada pras 21 categorias
          // amplas — é contra isso que o filtro de gênero do Top Álbuns
          // compara (ver curated-genre-mapper.ts e discovery.service.ts).
          curatedGenres: mapToCuratedGenres(album.genres ?? []),
          cachedAt: new Date(),
        },
        $setOnInsert: { _id: newObjectId() },
      },
      { upsert: true },
    );

    return album;
  }

  /**
   * Aba padrão do Descobrir: lançamentos puros, sem curadoria. A lista inteira
   * já vem ordenada por data e cabe em uma entrada de cache, então filtramos e
   * paginamos em memória — `total` aqui é real, e nenhuma página custa chamada
   * nova ao Spotify. Ver `SpotifyClientService.getRecentReleases` pra por que a
   * fonte não é `/browse/new-releases`.
   */
  async newReleases(
    genre: CuratedGenre | undefined,
    page: number,
    perPage: number,
  ): Promise<{ items: NewReleaseAlbum[]; total: number }> {
    const all = await this.recentReleases();
    const filtered = genre
      ? all.filter((item) => item.genres.includes(genre))
      : all;
    const start = (page - 1) * perPage;
    return {
      items: filtered.slice(start, start + perPage),
      total: filtered.length,
    };
  }

  /**
   * Só as categorias que têm álbum na leva atual — filtro com opção que não
   * devolve nada é pior que opção ausente. Mesmo contrato do chart da Apple,
   * vocabulário diferente (aqui são as categorias curadas, ver genres.constant).
   */
  async newReleasesGenres(): Promise<CuratedGenre[]> {
    const all = await this.recentReleases();
    return byFrequency(all.flatMap((item) => item.genres));
  }

  private recentReleases(): Promise<NewReleaseAlbum[]> {
    return this.cache.getOrSet(
      this.keys.spotifyNewReleases(),
      NEW_RELEASES_TTL_SECONDS,
      async () =>
        (await this.spotify.getRecentReleases()).map(toNewReleaseAlbum),
    );
  }

  /**
   * Spotify não tem rota de "top albums" nem "novos lançamentos" curada
   * (`/recommendations` e o filtro `genre:` da Search API pra álbuns estão
   * mortos — confirmado contra a API real, nov/2024). A Apple mantém um chart
   * público de Top Albums (RSS Generator v2, sem auth) com gênero real por
   * item — só não é *ranqueável* direto: o id é da Apple, não do Spotify, e
   * o ranking do produto inteiro roda sobre catálogo Spotify (faixas, preview).
   * Por isso cada item do chart é resolvido pro `spotifyId` equivalente via
   * busca por "artista álbum" (mesmo `search()` do catálogo, já cacheado).
   * Item sem correspondência no Spotify é descartado — não dá pra abrir uma
   * tela de ranking sem faixas.
   *
   * Filtro e paginação acontecem sobre o chart cru (gênero vem da Apple, não
   * precisa do Spotify) e só a página pedida é resolvida: resolver o chart
   * inteiro de uma vez custava ~8s no cache frio e jogava essa espera no
   * primeiro usuário depois de todo restart. Como item não resolvido é
   * descartado, uma página pode vir com menos itens que `perPage` — `total`
   * segue sendo o do chart filtrado.
   */
  async topAlbumsChart(
    genre: string | undefined,
    page: number,
    perPage: number,
  ): Promise<{ items: ChartAlbum[]; total: number }> {
    const chart = await this.chart();
    // rank é a posição no chart cheio, capturada antes do filtro de gênero —
    // filtrar não pode renumerar (o #47 do chart geral continua #47 filtrado).
    const ranked = chart.map((item, index) => ({ item, rank: index + 1 }));
    const filtered = genre
      ? ranked.filter(({ item }) => item.genres.includes(genre))
      : ranked;
    const start = (page - 1) * perPage;

    return {
      items: await this.resolvePage(filtered.slice(start, start + perPage)),
      total: filtered.length,
    };
  }

  async topAlbumsChartGenres(): Promise<string[]> {
    const chart = await this.chart();
    return byFrequency(chart.flatMap((item) => item.genres));
  }

  private chart(): Promise<ChartAlbumRaw[]> {
    return this.cache.getOrSet(
      this.keys.appleTopAlbumsChart(),
      CHART_TTL_SECONDS,
      () => this.appleCharts.fetchChart(),
    );
  }

  private async resolvePage(
    page: { item: ChartAlbumRaw; rank: number }[],
  ): Promise<ChartAlbum[]> {
    const resolved: ChartAlbum[] = [];

    for (let i = 0; i < page.length; i += CHART_RESOLVE_BATCH_SIZE) {
      const results = await Promise.all(
        page
          .slice(i, i + CHART_RESOLVE_BATCH_SIZE)
          .map(({ item, rank }) => this.resolveChartItem(item, rank)),
      );
      resolved.push(
        ...results.filter((item): item is ChartAlbum => item !== null),
      );
    }

    return resolved;
  }

  private async resolveChartItem(
    item: ChartAlbumRaw,
    rank: number,
  ): Promise<ChartAlbum | null> {
    const { items } = await this.search(
      `${item.artistName} ${item.name}`,
      1,
      0,
    ).catch(() => ({ items: [] as AlbumSummary[] }));
    const match = items[0];
    if (!match) return null;

    return {
      spotifyId: match.spotifyId,
      rank,
      name: item.name,
      artist: item.artistName,
      imageUrl: item.imageUrl,
      releaseDate: item.releaseDate,
      genres: item.genres,
    };
  }

  /**
   * Prévia de 30s sob demanda: só busca no iTunes quando o usuário clica em
   * play numa faixa específica, não pro álbum inteiro no load. Cacheada por
   * faixa (acerto e miss) — repetir o clique não bate no iTunes de novo.
   */
  async getTrackPreview(
    spotifyId: string,
    trackId: string,
  ): Promise<string | null> {
    const album = await this.getAlbum(spotifyId);
    const track = album?.tracks.find((t) => t.spotifyId === trackId);
    if (!album || !track) return null;
    if (track.previewUrl) return track.previewUrl;

    return this.cache.getOrSet(
      this.keys.itunesTrackPreview(trackId),
      PREVIEW_TTL_SECONDS,
      async () =>
        (await this.previewSource.fetchPreview(album.artist, track.name)) ??
        null,
    );
  }
}
