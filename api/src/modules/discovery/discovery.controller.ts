import {
  Controller,
  Get,
  Inject,
  Param,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../shared/infrastructure/decorators/public.decorator';
import {
  PublicCache,
  PublicCacheInterceptor,
} from '../../shared/infrastructure/interceptors/public-cache.interceptor';
import { DiscoveryService } from './discovery.service';
import { PaginationQueryDto } from './dtos/pagination-query.dto';
import { ByUserQueryDto } from './dtos/by-user-query.dto';
import { FeedQueryDto } from './dtos/feed-query.dto';

@ApiTags('discovery')
@Controller('discovery')
@UseInterceptors(PublicCacheInterceptor)
export class DiscoveryController {
  constructor(
    @Inject(DiscoveryService) private readonly discovery: DiscoveryService,
  ) {}

  @Public()
  @Get('feed')
  @PublicCache(30)
  async feed(@Query() query: FeedQueryDto) {
    return this.discovery.feed(query.page, query.perPage, query.cursor);
  }

  @Public()
  @Get('users/:userId')
  @PublicCache(30)
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
    );
  }

  @Public()
  @Get('users/:userId/stats')
  @PublicCache(60)
  async userStats(@Param('userId') userId: string) {
    return this.discovery.userStats(userId);
  }

  @Public()
  @Get('top-albums')
  @PublicCache(120)
  async topAlbums(@Query() query: PaginationQueryDto) {
    return this.discovery.topAlbums(query.page, query.perPage);
  }

  @Public()
  @Get('albums/:albumId/reviews')
  @PublicCache(60)
  async albumReviews(
    @Param('albumId') albumId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.discovery.albumReviews(albumId, query.page, query.perPage);
  }

  @Public()
  @Get('albums/:albumId/stats')
  @PublicCache(120)
  async albumStats(@Param('albumId') albumId: string) {
    return this.discovery.albumStats(albumId);
  }
}
