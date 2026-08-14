import {
  Controller,
  Get,
  Inject,
  Param,
  Query,
  UnauthorizedException,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../shared/infrastructure/decorators/public.decorator';
import { CurrentUser } from '../../shared/infrastructure/decorators/current-user.decorator';
import {
  PublicCache,
  PublicCacheInterceptor,
} from '../../shared/infrastructure/interceptors/public-cache.interceptor';
import { DiscoveryService } from './discovery.service';
import { PaginationQueryDto } from './dtos/pagination-query.dto';
import { ByUserQueryDto } from './dtos/by-user-query.dto';
import { FeedQueryDto } from './dtos/feed-query.dto';
import { TopAlbumsQueryDto } from './dtos/top-albums-query.dto';
import {
  AlbumReviewsPageDto,
  AlbumStatsDto,
  FeedPageDto,
  LastEditedAlbumDto,
  TopAlbumsPageDto,
  UserStatsDto,
} from './dtos/discovery.responses';

@ApiTags('discovery')
@Controller('discovery')
@UseInterceptors(PublicCacheInterceptor)
export class DiscoveryController {
  constructor(
    @Inject(DiscoveryService) private readonly discovery: DiscoveryService,
  ) {}

  /**
   * `scope=following` é privado (depende de quem pergunta) e não passa pelo
   * cache público — por isso a rota segue `@Public()` mas o caminho pessoal
   * exige token e devolve 401 sem ele.
   */
  @Public()
  @Get('feed')
  @PublicCache(30)
  @ApiOkResponse({ type: FeedPageDto })
  async feed(
    @Query() query: FeedQueryDto,
    @CurrentUser() user: { sub: string } | undefined,
  ) {
    if (query.scope === 'following') {
      if (!user) throw new UnauthorizedException('Token de acesso ausente.');
      return this.discovery.followingFeed(
        user.sub,
        query.page,
        query.perPage,
        query.cursor,
        query.genre,
      );
    }
    return this.discovery.feed(
      query.page,
      query.perPage,
      query.cursor,
      query.genre,
    );
  }

  @Public()
  @Get('users/:userId')
  @PublicCache(30)
  @ApiOkResponse({ type: FeedPageDto })
  async byUser(
    @Param('userId') userId: string,
    @Query() query: ByUserQueryDto,
  ) {
    return this.discovery.byUser(
      userId,
      query.page,
      query.perPage,
      query.search,
      query.sort,
      query.genre,
    );
  }

  @Public()
  @Get('users/:userId/stats')
  @PublicCache(60)
  @ApiOkResponse({ type: UserStatsDto })
  async userStats(@Param('userId') userId: string) {
    return this.discovery.userStats(userId);
  }

  @Public()
  @Get('top-albums')
  @PublicCache(120)
  @ApiOkResponse({ type: TopAlbumsPageDto })
  async topAlbums(@Query() query: TopAlbumsQueryDto) {
    return this.discovery.topAlbums(query.page, query.perPage, query.genre);
  }

  @Public()
  @Get('albums/:albumId/reviews')
  @PublicCache(60)
  @ApiOkResponse({ type: AlbumReviewsPageDto })
  async albumReviews(
    @Param('albumId') albumId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.discovery.albumReviews(albumId, query.page, query.perPage);
  }

  @Public()
  @Get('albums/:albumId/stats')
  @PublicCache(120)
  @ApiOkResponse({ type: AlbumStatsDto })
  async albumStats(@Param('albumId') albumId: string) {
    return this.discovery.albumStats(albumId);
  }

  // Sem @Public: é dado do próprio usuário logado, nunca de outro — por isso
  // não leva @PublicCache também (o interceptor já pula "dono dos próprios
  // dados", mas aqui nem existe rota pública equivalente pra confundir).
  @ApiOkResponse({
    type: LastEditedAlbumDto,
    description: 'null quando o usuário ainda não editou nenhum álbum.',
  })
  @Get('me/last-edited-album')
  async lastEditedAlbum(@CurrentUser() user: { sub: string }) {
    return this.discovery.lastEditedAlbum(user.sub);
  }
}
