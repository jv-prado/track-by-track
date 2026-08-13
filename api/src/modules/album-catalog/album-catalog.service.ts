import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { SpotifyClientService } from './spotify-client.service';
import { AlbumSchemaClass } from './album.schema';
import { AlbumDetail, AlbumSummary } from './spotify-normalizer';
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
}

export interface AlbumStore {
  findOne(filter: { spotifyId: string }): {
    lean(): { exec(): Promise<AlbumSchemaClass | null> };
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
    @InjectModel(AlbumSchemaClass.name)
    private readonly albumModel: AlbumStore,
    @Inject(CACHE) private readonly cache: Cache,
    @Inject(CacheKeys) private readonly keys: CacheKeys,
  ) {}

  async search(
    query: string,
    limit: number,
    offset: number,
  ): Promise<{ items: AlbumSummary[]; total: number }> {
    return this.cache.getOrSet(
      this.keys.spotifySearch(query, limit, offset),
      SEARCH_TTL_SECONDS,
      () => this.spotify.searchAlbums(query, limit, offset),
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
        $set: { ...album, cachedAt: new Date() },
        $setOnInsert: { _id: randomUUID() },
      },
      { upsert: true },
    );

    return album;
  }
}
