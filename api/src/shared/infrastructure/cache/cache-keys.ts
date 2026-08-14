import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Fatia mínima do ConfigService — deixa o teste passar um fake sem cast. */
export interface CachePrefixConfig {
  get(key: 'CACHE_PREFIX' | 'NODE_ENV'): string;
}

/** Texto livre do usuário nunca entra cru na chave — cardinalidade e caracteres. */
function hash(value: string): string {
  return createHash('sha1')
    .update(value.trim().toLowerCase())
    .digest('hex')
    .slice(0, 12);
}

/**
 * Único lugar do projeto que monta string de chave de cache. Chave montada solta
 * no meio de um service é como se perde invalidação: uma escreve `feed:1:30` e
 * outra `feed:p1:30`, e o bump nunca alcança as duas.
 */
@Injectable()
export class CacheKeys {
  private readonly root: string;

  constructor(@Inject(ConfigService) config: CachePrefixConfig) {
    // env na chave: dev e prod apontando pro mesmo Redis não se contaminam
    this.root = `${config.get('CACHE_PREFIX')}:${config.get('NODE_ENV')}`;
  }

  // --- versões (epoch) -----------------------------------------------------
  versionRankings(): string {
    return `${this.root}:ver:rankings`;
  }

  versionAlbum(albumId: string): string {
    return `${this.root}:ver:album:${albumId}`;
  }

  versionUser(userId: string): string {
    return `${this.root}:ver:user:${userId}`;
  }

  // --- Spotify -------------------------------------------------------------
  spotifySearch(query: string, limit: number, offset: number): string {
    return `${this.root}:spotify:search:${hash(query)}:${limit}:${offset}`;
  }

  spotifyAlbumMissing(spotifyId: string): string {
    return `${this.root}:spotify:album-missing:${spotifyId}`;
  }

  spotifyToken(): string {
    return `${this.root}:spotify:token`;
  }

  /** Sem page/perPage: a lista inteira é cacheada uma vez e paginada em memória. */
  spotifyNewReleases(): string {
    return `${this.root}:spotify:new-releases:recent`;
  }

  // --- Apple (chart de Top Albums, RSS público sem auth) -------------------
  /** Chart cru (sem `spotifyId`) — a resolução por item cai no cache de busca. */
  appleTopAlbumsChart(): string {
    return `${this.root}:apple:top-albums:chart`;
  }

  // --- iTunes (prévia de áudio, fonte substituta do Spotify) ---------------
  itunesTrackPreview(trackId: string): string {
    return `${this.root}:itunes:preview:${trackId}`;
  }

  // --- Discovery -----------------------------------------------------------
  feedPage(
    version: number,
    page: number,
    perPage: number,
    genre?: string,
  ): string {
    return `${this.root}:feed:v${version}:p${page}:${perPage}:${genre ?? 'all'}`;
  }

  feedCursor(
    version: number,
    cursor: string,
    perPage: number,
    genre?: string,
  ): string {
    return `${this.root}:feed:v${version}:c${hash(cursor)}:${perPage}:${genre ?? 'all'}`;
  }

  feedTotal(version: number, genre?: string): string {
    return `${this.root}:feed-total:v${version}:${genre ?? 'all'}`;
  }

  topAlbums(
    version: number,
    page: number,
    perPage: number,
    genre?: string,
  ): string {
    return `${this.root}:top-albums:v${version}:p${page}:${perPage}:${genre ?? 'all'}`;
  }

  albumStats(version: number, albumId: string): string {
    return `${this.root}:album-stats:v${version}:${albumId}`;
  }

  albumReviews(
    version: number,
    albumId: string,
    page: number,
    perPage: number,
  ): string {
    return `${this.root}:album-reviews:v${version}:${albumId}:p${page}:${perPage}`;
  }

  userStats(version: number, userId: string): string {
    return `${this.root}:user-stats:v${version}:${userId}`;
  }

  userRankings(
    version: number,
    userId: string,
    sort: string,
    page: number,
    perPage: number,
    genre?: string,
  ): string {
    return `${this.root}:user-rankings:v${version}:${userId}:${sort}:p${page}:${perPage}:${genre ?? 'all'}`;
  }

  lastEditedAlbum(version: number, userId: string): string {
    return `${this.root}:last-edited:v${version}:${userId}`;
  }
}
