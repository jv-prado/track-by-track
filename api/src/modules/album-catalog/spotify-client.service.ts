import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CACHE,
  type Cache,
} from '../../shared/infrastructure/cache/cache.port';
import { CacheKeys } from '../../shared/infrastructure/cache/cache-keys';
import {
  SPOTIFY_HTTP_CLIENT,
  SpotifyNotFoundError,
  type SpotifyHttpClient,
} from './spotify-http-client';
import {
  AlbumDetail,
  AlbumSummary,
  normalizeAlbumDetail,
  normalizeAlbumSummary,
  RecentRelease,
  SpotifyAlbumDetailRaw,
  SpotifyAlbumSummaryRaw,
  SpotifySearchResponseRaw,
  SpotifySeveralArtistsResponseRaw,
} from './spotify-normalizer';

const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const API_BASE_URL = 'https://api.spotify.com/v1';
/** Margem de segurança pra renovar o token antes do Spotify expirá-lo de fato. */
const TOKEN_EXPIRY_SAFETY_MARGIN_MS = 60_000;
/** Janela do lock de renovação: curta, só cobre o round-trip do `/api/token`. */
const TOKEN_LOCK_TTL_SECONDS = 10;
const TOKEN_LOCK_WAIT_MS = 120;
/** Máximo aceito pelo `/search`. */
const NEW_RELEASES_PAGE_SIZE = 50;
/**
 * Só `tag:new` — é o sinal literal do próprio Spotify pra "isso é recente"
 * (~últimas 2 semanas). Existia um fallback com `year:2025-2026` pra encher
 * gênero fora do mainstream, mas `year:` não ordena por data, ordena por
 * relevância dentro do ano — trazia álbum "relevante" que não é
 * necessariamente recente, diluindo a lista. Removido: o produto quer
 * lançamento de verdade, não profundidade de catálogo (decisão explícita,
 * troca aceita: gênero de nicho pode ter menos opção no filtro).
 *
 * O número de páginas é o botão de "tempo da primeira carga": cada página é
 * uma busca no Spotify, e a conta toda tem que caber em poucos segundos. Subir
 * isso aumenta o acervo por gênero e a espera na mesma proporção.
 */
const NEW_RELEASES_PAGES = 10;
/**
 * Duas semanas, não seis meses: `tag:new` só cobre isso mesmo (ver acima) —
 * uma janela maior não traria mais itens, só deixaria `dedupeReleases`
 * aceitando lixo antigo que sobrasse de uma resposta mal-rankeada. A lista
 * vem da mais recente pra mais antiga, então quem não rola vê só o que
 * acabou de sair.
 */
const NEW_RELEASES_WINDOW_DAYS = 14;
/**
 * Mercados diferentes devolvem listas bem diferentes (medido: BR e JP
 * compartilham ~27% dos ids) — unir é o que dá volume. `BR` primeiro por ser o
 * público do produto.
 */
const NEW_RELEASES_MARKETS = ['BR', 'US', 'GB'];
/**
 * 15 em paralelo passam num burst curto, mas aqui são dezenas de buscas
 * seguidas: a cota estoura no meio e a espera do `Retry-After` dobrava o tempo
 * total (17s contra ~8s). Menos paralelismo termina antes.
 */
const NEW_RELEASES_CONCURRENCY = 8;
/** Máximo de ids aceito por chamada em `/artists`. */
const ARTISTS_BATCH_SIZE = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * `release_date` do Spotify vem com precisão variável (`2026`, `2026-08`,
 * `2026-08-14`) e a comparação é textual — sem completar, "2026" ficaria antes
 * de qualquer corte do próprio ano e o álbum sumiria. Completa pro fim do
 * período: data imprecisa entra na janela em vez de ser descartada em silêncio.
 */
function endOfPeriod(releaseDate: string | undefined): string {
  if (!releaseDate) return '';
  if (releaseDate.length === 4) return `${releaseDate}-12-31`;
  if (releaseDate.length === 7) return `${releaseDate}-31`;
  return releaseDate;
}

/**
 * `total_tracks`, não `album_type` — Spotify não distingue EP de single nesse
 * campo (os dois vêm `album_type: "single"`; confirmado contra a API real:
 * "Maverick 'Almost Forever' EP" do Lil Uzi Vert, 8 faixas, `album_type:
 * "single"`). Só a contagem de faixas separa uma faixa avulsa de verdade
 * (`total_tracks: 1`) de um EP rankeável. Ausente = não descarta (dado
 * incerto não vira exclusão silenciosa).
 */
function isSingleTrackRelease(item: SpotifyAlbumSummaryRaw): boolean {
  return item.total_tracks === 1;
}

/**
 * Três limpezas que a resposta crua não faz: single não é álbum rankeável, o
 * mesmo lançamento reaparece com ids diferentes por mercado (era daí que vinha
 * o card duplicado no grid), e `year:` traz o ano inteiro quando a aba só quer
 * o que é recente. A ordenação é nossa porque a busca devolve por relevância,
 * não por data.
 */
function dedupeReleases(
  raw: SpotifyAlbumSummaryRaw[],
  since: string,
): SpotifyAlbumSummaryRaw[] {
  const byRelease = new Map<string, SpotifyAlbumSummaryRaw>();

  for (const item of raw) {
    if (isSingleTrackRelease(item)) continue;
    if (endOfPeriod(item.release_date) < since) continue;
    const key =
      `${item.name}|${item.artists.map((artist) => artist.name).join(',')}`.toLowerCase();
    if (!byRelease.has(key)) byRelease.set(key, item);
  }

  return [...byRelease.values()].sort((a, b) =>
    (b.release_date ?? '').localeCompare(a.release_date ?? ''),
  );
}

export interface SpotifyCredentialsConfig {
  get(key: 'SPOTIFY_CLIENT_ID' | 'SPOTIFY_CLIENT_SECRET'): string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

interface TokenResponseRaw {
  access_token: string;
  expires_in: number;
}

@Injectable()
export class SpotifyClientService {
  private cachedToken: CachedToken | null = null;

  constructor(
    @Inject(SPOTIFY_HTTP_CLIENT) private readonly http: SpotifyHttpClient,
    @Inject(ConfigService) private readonly config: SpotifyCredentialsConfig,
    @Inject(CACHE) private readonly cache: Cache,
    @Inject(CacheKeys) private readonly keys: CacheKeys,
  ) {}

  async searchAlbums(
    query: string,
    limit: number,
    offset: number,
  ): Promise<{ items: AlbumSummary[]; total: number }> {
    const token = await this.getAppAccessToken();
    const response = await this.http.get<SpotifySearchResponseRaw>(
      `${API_BASE_URL}/search`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { q: query, type: 'album', limit, offset },
      },
    );
    // Spotify's `type=album` search param é a categoria "álbuns", que inclui
    // singles e compilações — não filtra por album_type. Descartamos faixa
    // avulsa aqui (ver `isSingleTrackRelease`), não EP.
    return {
      items: response.data.albums.items
        .filter((item) => !isSingleTrackRelease(item))
        .map(normalizeAlbumSummary),
      total: response.data.albums.total,
    };
  }

  /**
   * `/browse/new-releases` está morto na prática: devolve sempre os mesmos 100
   * itens, a maioria de 2023/2024, e ignora `country` (confirmado contra a API
   * real em ago/2026 — a aba "Novidades" abria com álbum de 2023). A Search API
   * com `tag:new` é o que ainda reflete lançamento de verdade. O preço é que
   * ~90% do retorno é single, então varremos várias páginas, em vários
   * mercados e com duas consultas (ver constantes acima), e filtramos — pedir
   * uma página só devolvia meia dúzia de álbuns por gênero.
   */
  async getRecentReleases(): Promise<RecentRelease[]> {
    const token = await this.getAppAccessToken();
    const now = new Date();
    const since = new Date(now.getTime() - NEW_RELEASES_WINDOW_DAYS * DAY_MS)
      .toISOString()
      .slice(0, 10);
    const requests = NEW_RELEASES_MARKETS.flatMap((market) =>
      Array.from({ length: NEW_RELEASES_PAGES }, (_, index) => ({
        market,
        query: 'tag:new',
        offset: index * NEW_RELEASES_PAGE_SIZE,
      })),
    );
    const raw: SpotifyAlbumSummaryRaw[] = [];

    for (let i = 0; i < requests.length; i += NEW_RELEASES_CONCURRENCY) {
      const pages = await Promise.all(
        requests
          .slice(i, i + NEW_RELEASES_CONCURRENCY)
          .map(({ market, query, offset }) =>
            this.fetchRecentReleasePage(token, query, market, offset),
          ),
      );
      raw.push(...pages.flat());
    }

    const releases = dedupeReleases(raw, since);
    const genresByArtist = await this.getGenresByArtist(
      [
        ...new Set(
          releases.flatMap((item) =>
            item.artists
              .map((artist) => artist.id)
              .filter((id): id is string => Boolean(id)),
          ),
        ),
      ],
      token,
    );

    return releases.map((item) => ({
      ...normalizeAlbumSummary(item),
      genres: [
        ...new Set(
          item.artists.flatMap((artist) =>
            artist.id ? (genresByArtist.get(artist.id) ?? []) : [],
          ),
        ),
      ],
    }));
  }

  private async fetchRecentReleasePage(
    token: string,
    query: string,
    market: string,
    offset: number,
  ): Promise<SpotifyAlbumSummaryRaw[]> {
    try {
      const response = await this.http.get<SpotifySearchResponseRaw>(
        `${API_BASE_URL}/search`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            q: query,
            type: 'album',
            limit: NEW_RELEASES_PAGE_SIZE,
            offset,
            market,
          },
        },
      );
      return response.data.albums.items;
      // Página funda além do fim do índice, ou 429 isolado: perder uma página
      // de 50 encurta a lista, derrubar a resolução inteira zera o Descobrir.
    } catch {
      return [];
    }
  }

  /**
   * Gênero mora no artista, não no álbum — para a lista de lançamentos são ~3
   * chamadas em lote (50 ids cada) por resolução, não uma por álbum. Falha de
   * lote devolve mapa parcial: sem gênero o álbum ainda aparece, só não entra
   * em filtro nenhum.
   */
  private async getGenresByArtist(
    artistIds: string[],
    token: string,
  ): Promise<Map<string, string[]>> {
    const batches: string[][] = [];
    for (let i = 0; i < artistIds.length; i += ARTISTS_BATCH_SIZE) {
      batches.push(artistIds.slice(i, i + ARTISTS_BATCH_SIZE));
    }

    const responses = await Promise.all(
      batches.map((ids) =>
        this.http
          .get<SpotifySeveralArtistsResponseRaw>(`${API_BASE_URL}/artists`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { ids: ids.join(',') },
          })
          .then((response) => response.data.artists)
          .catch(() => []),
      ),
    );

    return new Map(
      responses.flat().map((artist) => [artist.id, artist.genres]),
    );
  }

  async getAlbumWithTracks(spotifyId: string): Promise<AlbumDetail | null> {
    const token = await this.getAppAccessToken();
    try {
      const response = await this.http.get<SpotifyAlbumDetailRaw>(
        `${API_BASE_URL}/albums/${spotifyId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const artistIds = [
        ...new Set(
          response.data.artists
            .map((artist) => artist.id)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      const genres = await this.getArtistGenres(artistIds);
      return normalizeAlbumDetail(response.data, genres);
    } catch (error) {
      if (error instanceof SpotifyNotFoundError) return null;
      throw error;
    }
  }

  /**
   * Gênero mora no artista, não no álbum — batch `/artists?ids=` custa uma
   * chamada extra só no cache-miss de `getAlbumWithTracks` (7 dias de TTL),
   * nunca em listagem.
   */
  private async getArtistGenres(artistIds: string[]): Promise<string[]> {
    if (artistIds.length === 0) return [];
    try {
      const token = await this.getAppAccessToken();
      const response = await this.http.get<SpotifySeveralArtistsResponseRaw>(
        `${API_BASE_URL}/artists`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { ids: artistIds.slice(0, 50).join(',') },
        },
      );
      return [...new Set(response.data.artists.flatMap((a) => a.genres))];
    } catch {
      // gênero é enriquecimento, não crítico — falha aqui não pode derrubar
      // o cache do álbum (nome/capa/faixas continuam valendo).
      return [];
    }
  }

  private async getAppAccessToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      return this.cachedToken.accessToken;
    }

    const shared = await this.readSharedToken();
    if (shared) return shared;

    // Lock: N instâncias reiniciando juntas pedem UM token, não N — o Spotify
    // limita `/api/token` e cada emissão invalida a anterior em alguns planos.
    const lockKey = `${this.keys.spotifyToken()}:lock`;
    const acquired = await this.cache.setIfAbsent(
      lockKey,
      1,
      TOKEN_LOCK_TTL_SECONDS,
    );
    if (!acquired) {
      await new Promise((resolve) => setTimeout(resolve, TOKEN_LOCK_WAIT_MS));
      const afterWait = await this.readSharedToken();
      if (afterWait) return afterWait;
      // quem tinha o lock falhou ou demorou: seguir e buscar é melhor que 500
    }

    const token = await this.fetchAppAccessToken();
    await this.cache.del(lockKey);
    return token;
  }

  private async readSharedToken(): Promise<string | null> {
    const cached = await this.cache.get<CachedToken>(this.keys.spotifyToken());
    if (!cached || cached.value.expiresAt <= Date.now()) return null;
    this.cachedToken = cached.value;
    return cached.value.accessToken;
  }

  private async fetchAppAccessToken(): Promise<string> {
    const clientId = this.config.get('SPOTIFY_CLIENT_ID');
    const clientSecret = this.config.get('SPOTIFY_CLIENT_SECRET');
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64',
    );

    const response = await this.http.post<TokenResponseRaw>(
      TOKEN_URL,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    const token: CachedToken = {
      accessToken: response.data.access_token,
      expiresAt:
        Date.now() +
        response.data.expires_in * 1000 -
        TOKEN_EXPIRY_SAFETY_MARGIN_MS,
    };
    this.cachedToken = token;

    const ttlSeconds = Math.floor((token.expiresAt - Date.now()) / 1000);
    if (ttlSeconds > 0) {
      await this.cache.set(this.keys.spotifyToken(), token, ttlSeconds);
    }
    return token.accessToken;
  }
}
