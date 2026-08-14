import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../shared/infrastructure/decorators/public.decorator';
import { CurrentUser } from '../../shared/infrastructure/decorators/current-user.decorator';
import { UserDirectoryService } from '../identity/application/services/user-directory.service';
import { buildPaginationMeta } from '../../shared/infrastructure/pagination';
import { FollowsService } from './follows.service';
import { ListFollowsQueryDto } from './dtos/list-follows-query.dto';
import { SearchUsersQueryDto } from './dtos/search-users-query.dto';
import {
  FollowStatsDto,
  FollowUsersPageDto,
  UserSearchPageDto,
} from './dtos/follow.responses';

@ApiTags('follows')
@Controller('users')
export class FollowsController {
  constructor(
    @Inject(FollowsService) private readonly follows: FollowsService,
    @Inject(UserDirectoryService)
    private readonly userDirectory: UserDirectoryService,
  ) {}

  // rota estática (`search`) não colide com `:userId/...` abaixo — formas de
  // path diferentes — mas fica antes por convenção (ver AlbumCatalogController).
  @Public()
  @ApiOkResponse({ type: UserSearchPageDto })
  @Get('search')
  async search(@Query() query: SearchUsersQueryDto) {
    const offset = (query.page - 1) * query.perPage;
    const { items, total } = await this.userDirectory.searchPublicProfiles(
      query.q,
      query.perPage,
      offset,
    );
    return {
      data: items,
      meta: buildPaginationMeta(query.page, query.perPage, total),
    };
  }

  @ApiOkResponse({ type: FollowStatsDto })
  @HttpCode(HttpStatus.OK)
  @Post(':userId/follow')
  async follow(
    @Param('userId') userId: string,
    @CurrentUser() user: { sub: string },
  ) {
    await this.follows.follow(user.sub, userId);
    return this.follows.stats(userId, user.sub);
  }

  @ApiOkResponse({ type: FollowStatsDto })
  @HttpCode(HttpStatus.OK)
  @Delete(':userId/follow')
  async unfollow(
    @Param('userId') userId: string,
    @CurrentUser() user: { sub: string },
  ) {
    await this.follows.unfollow(user.sub, userId);
    return this.follows.stats(userId, user.sub);
  }

  /**
   * Pública, mas `isFollowing` depende de quem pergunta — o guard anexa o
   * usuário quando há token válido (ver JwtAuthGuard.tryAttachUser).
   */
  @Public()
  @ApiOkResponse({ type: FollowStatsDto })
  @Get(':userId/follow-stats')
  async stats(
    @Param('userId') userId: string,
    @CurrentUser() user: { sub: string } | undefined,
  ) {
    return this.follows.stats(userId, user?.sub);
  }

  @Public()
  @ApiOkResponse({ type: FollowUsersPageDto })
  @Get(':userId/followers')
  async followers(
    @Param('userId') userId: string,
    @Query() query: ListFollowsQueryDto,
  ) {
    return this.follows.listFollowers(userId, query.page, query.perPage);
  }

  @Public()
  @ApiOkResponse({ type: FollowUsersPageDto })
  @Get(':userId/following')
  async following(
    @Param('userId') userId: string,
    @Query() query: ListFollowsQueryDto,
  ) {
    return this.follows.listFollowing(userId, query.page, query.perPage);
  }
}
