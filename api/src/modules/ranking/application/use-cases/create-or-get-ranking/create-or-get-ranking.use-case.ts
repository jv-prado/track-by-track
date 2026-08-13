import { Inject, Injectable } from '@nestjs/common';
import {
  RANKING_REPOSITORY,
  type RankingRepository,
} from '../../../domain/repositories/ranking.repository';
import { AlbumRanking } from '../../../domain/entities/album-ranking.aggregate';
import { AlbumCatalogService } from '../../../../album-catalog/album-catalog.service';
import { AlbumNotFoundError } from '../../../../album-catalog/errors/album-not-found.error';
import { type AlbumCatalogPort } from '../../ports/album-catalog.port';
import { RankingView, toRankingView } from '../../ranking-view';
import {
  CACHE_INVALIDATOR,
  type CacheInvalidator,
} from '../../../../../shared/application/ports/cache-invalidator.port';

export interface CreateOrGetRankingInput {
  userId: string;
  albumId: string;
}

export interface CreateOrGetRankingOutput {
  ranking: RankingView;
  created: boolean;
}

@Injectable()
export class CreateOrGetRankingUseCase {
  constructor(
    @Inject(RANKING_REPOSITORY) private readonly rankings: RankingRepository,
    @Inject(AlbumCatalogService)
    private readonly albumCatalog: AlbumCatalogPort,
    @Inject(CACHE_INVALIDATOR)
    private readonly cacheInvalidator: CacheInvalidator,
  ) {}

  async execute(
    input: CreateOrGetRankingInput,
  ): Promise<CreateOrGetRankingOutput> {
    const existing = await this.rankings.findByUserAndAlbum(
      input.userId,
      input.albumId,
    );
    if (existing) {
      return { ranking: toRankingView(existing), created: false };
    }

    const album = await this.albumCatalog.getAlbum(input.albumId);
    if (!album) {
      throw new AlbumNotFoundError();
    }

    const ranking = AlbumRanking.create({
      userId: input.userId,
      albumId: input.albumId,
      tracks: album.tracks.map((track) => ({
        trackId: track.spotifyId,
        trackNumber: track.trackNumber,
      })),
    });

    await this.rankings.save(ranking);
    // Ranking nasce incompleto: não entra no feed, só na lista do próprio usuário.
    await this.cacheInvalidator.rankingChanged(input.albumId, input.userId);
    return { ranking: toRankingView(ranking), created: true };
  }
}
