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
import { FollowsService } from './follows.service';
import { ListFollowsQueryDto } from './dtos/list-follows-query.dto';
import { FollowStatsDto, FollowUsersPageDto } from './dtos/follow.responses';

@ApiTags('follows')
@Controller('users')
export class FollowsController {
  constructor(
    @Inject(FollowsService) private readonly follows: FollowsService,
  ) {}

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
