import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../shared/infrastructure/decorators/public.decorator';
import { AlbumCatalogService } from './album-catalog.service';
import { SearchAlbumsQueryDto } from './search-albums-query.dto';
import { AlbumNotFoundError } from './errors/album-not-found.error';

@ApiTags('albums')
@Controller('albums')
export class AlbumCatalogController {
  constructor(
    @Inject(AlbumCatalogService)
    private readonly albumCatalog: AlbumCatalogService,
  ) {}

  @Public()
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

  @Public()
  @Get(':spotifyId')
  async getAlbum(@Param('spotifyId') spotifyId: string) {
    const album = await this.albumCatalog.getAlbum(spotifyId);
    if (!album) {
      throw new AlbumNotFoundError();
    }
    return album;
  }
}
