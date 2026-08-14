import { Controller, Get, Inject, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../shared/infrastructure/decorators/public.decorator';
import { AlbumCatalogService } from './album-catalog.service';
import { AlbumCoverService } from './album-cover.service';
import { SearchAlbumsQueryDto } from './search-albums-query.dto';
import { NewReleasesQueryDto } from './new-releases-query.dto';
import { TopChartQueryDto } from './top-chart-query.dto';
import { AlbumNotFoundError } from './errors/album-not-found.error';
import { CURATED_GENRES } from './genres.constant';
import {
  AlbumDetailDto,
  AlbumSearchPageDto,
  NewReleasesPageDto,
  TopChartPageDto,
  TrackPreviewDto,
} from './dtos/album.responses';

@ApiTags('albums')
@Controller('albums')
export class AlbumCatalogController {
  constructor(
    @Inject(AlbumCatalogService)
    private readonly albumCatalog: AlbumCatalogService,
    @Inject(AlbumCoverService)
    private readonly albumCover: AlbumCoverService,
  ) {}

  @Public()
  @ApiOkResponse({ type: AlbumSearchPageDto })
  @Get('search')
  async search(@Query() query: SearchAlbumsQueryDto) {
    const offset = (query.page - 1) * query.perPage;
    const { items, total } = await this.albumCatalog.search(
      query.q,
      query.perPage,
      offset,
    );
    return {
      data: items,
      meta: {
        page: query.page,
        perPage: query.perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.perPage)),
      },
    };
  }

  // rotas estáticas (`genres`, `new-releases`, `top-chart`) precisam vir antes
  // de `:spotifyId` — senão o Nest casa `/albums/genres` com o param dinâmico
  // primeiro.
  @Public()
  @ApiOkResponse({ type: [String] })
  @Get('genres')
  getGenres() {
    return CURATED_GENRES;
  }

  /** Aba padrão do Descobrir — ver AlbumCatalogService.newReleases. */
  @Public()
  @ApiOkResponse({ type: NewReleasesPageDto })
  @Get('new-releases')
  async newReleases(@Query() query: NewReleasesQueryDto) {
    const { items, total } = await this.albumCatalog.newReleases(
      query.genre,
      query.page,
      query.perPage,
    );
    return {
      data: items,
      meta: {
        page: query.page,
        perPage: query.perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.perPage)),
      },
    };
  }

  /** Só as categorias presentes na leva atual — ver `newReleasesGenres`. */
  @Public()
  @ApiOkResponse({ type: [String] })
  @Get('new-releases/genres')
  async newReleasesGenres() {
    return this.albumCatalog.newReleasesGenres();
  }

  /**
   * Chart de Top Albums da Apple (ver album-catalog.service.ts `topAlbumsChart`)
   * — cada item já vem resolvido pro `spotifyId` equivalente, então o card
   * abre a mesma tela de ranking de sempre. Paginação simples: o chart inteiro
   * (~100 itens, já filtrado por gênero) cabe em cache, então `page`/`total`
   * aqui são reais.
   */
  @Public()
  @ApiOkResponse({ type: TopChartPageDto })
  @Get('top-chart')
  async topChart(@Query() query: TopChartQueryDto) {
    const { items, total } = await this.albumCatalog.topAlbumsChart(
      query.genre,
      query.page,
      query.perPage,
    );
    return {
      data: items,
      meta: {
        page: query.page,
        perPage: query.perPage,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.perPage)),
      },
    };
  }

  @Public()
  @ApiOkResponse({ type: [String] })
  @Get('top-chart/genres')
  async topChartGenres() {
    return this.albumCatalog.topAlbumsChartGenres();
  }

  @Public()
  @ApiOkResponse({ type: AlbumDetailDto })
  @Get(':spotifyId')
  async getAlbum(@Param('spotifyId') spotifyId: string) {
    const album = await this.albumCatalog.getAlbum(spotifyId);
    if (!album) {
      throw new AlbumNotFoundError();
    }
    return album;
  }

  @Public()
  /**
   * Capa servida pelo nosso domínio para o card compartilhável poder desenhá-la
   * no `<canvas>` sem contaminá-lo (ver AlbumCoverService). Cache longo: a capa
   * de um álbum não muda.
   */
  @Public()
  @ApiOkResponse({ description: 'Bytes da capa (image/jpeg).' })
  @Get(':spotifyId/cover')
  async getCover(
    @Param('spotifyId') spotifyId: string,
    @Res() res: Response,
  ): Promise<void> {
    const cover = await this.albumCover.getCover(spotifyId);
    if (!cover) throw new AlbumNotFoundError();

    res.setHeader('Content-Type', cover.contentType);
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    res.send(cover.body);
  }

  @ApiOkResponse({ type: TrackPreviewDto })
  @Get(':spotifyId/tracks/:trackId/preview')
  async getTrackPreview(
    @Param('spotifyId') spotifyId: string,
    @Param('trackId') trackId: string,
  ) {
    const previewUrl = await this.albumCatalog.getTrackPreview(
      spotifyId,
      trackId,
    );
    return { previewUrl };
  }
}
