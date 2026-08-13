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
  SpotifyAlbumDetailRaw,
  SpotifySearchResponseRaw,
} from './spotify-normalizer';

const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const API_BASE_URL = 'https://api.spotify.com/v1';
/** Margem de segurança pra renovar o token antes do Spotify expirá-lo de fato. */
const TOKEN_EXPIRY_SAFETY_MARGIN_MS = 60_000;
/** Janela do lock de renovação: curta, só cobre o round-trip do `/api/token`. */
const TOKEN_LOCK_TTL_SECONDS = 10;
const TOKEN_LOCK_WAIT_MS = 120;

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
    return {
      items: response.data.albums.items.map(normalizeAlbumSummary),
      total: response.data.albums.total,
    };
  }

  async getAlbumWithTracks(spotifyId: string): Promise<AlbumDetail | null> {
    const token = await this.getAppAccessToken();
    try {
      const response = await this.http.get<SpotifyAlbumDetailRaw>(
        `${API_BASE_URL}/albums/${spotifyId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return normalizeAlbumDetail(response.data);
    } catch (error) {
      if (error instanceof SpotifyNotFoundError) return null;
      throw error;
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
