import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../shared/infrastructure/decorators/public.decorator';
import { CurrentUser } from '../../../shared/infrastructure/decorators/current-user.decorator';
import { CreateOrGetRankingUseCase } from '../application/use-cases/create-or-get-ranking/create-or-get-ranking.use-case';
import { RateTrackUseCase } from '../application/use-cases/rate-track/rate-track.use-case';
import { SetTrackIgnoredUseCase } from '../application/use-cases/set-track-ignored/set-track-ignored.use-case';
import { SaveReviewUseCase } from '../application/use-cases/save-review/save-review.use-case';
import { GetRankingUseCase } from '../application/use-cases/get-ranking/get-ranking.use-case';
import { ResetRankingUseCase } from '../application/use-cases/reset-ranking/reset-ranking.use-case';
import { DeleteRankingUseCase } from '../application/use-cases/delete-ranking/delete-ranking.use-case';
import { CreateRankingDto } from './dtos/create-ranking.dto';
import { RateTrackDto } from './dtos/rate-track.dto';
import { SetTrackIgnoredDto } from './dtos/set-track-ignored.dto';
import { SaveReviewDto } from './dtos/save-review.dto';
import { RankingViewDto } from './dtos/ranking.responses';

@ApiTags('rankings')
@Controller('rankings')
export class RankingsController {
  constructor(
    @Inject(CreateOrGetRankingUseCase)
    private readonly createOrGetRanking: CreateOrGetRankingUseCase,
    @Inject(RateTrackUseCase) private readonly rateTrack: RateTrackUseCase,
    @Inject(SetTrackIgnoredUseCase)
    private readonly setTrackIgnored: SetTrackIgnoredUseCase,
    @Inject(SaveReviewUseCase) private readonly saveReview: SaveReviewUseCase,
    @Inject(GetRankingUseCase) private readonly getRanking: GetRankingUseCase,
    @Inject(ResetRankingUseCase)
    private readonly resetRanking: ResetRankingUseCase,
    @Inject(DeleteRankingUseCase)
    private readonly deleteRanking: DeleteRankingUseCase,
  ) {}

  @ApiCreatedResponse({ type: RankingViewDto })
  @ApiOkResponse({
    type: RankingViewDto,
    description: 'Ranking já existia — devolvido sem criar outro.',
  })
  @Post()
  async create(
    @Body() dto: CreateRankingDto,
    @CurrentUser() user: { sub: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const output = await this.createOrGetRanking.execute({
      userId: user.sub,
      albumId: dto.albumId,
    });
    res.status(output.created ? HttpStatus.CREATED : HttpStatus.OK);
    return output.ranking;
  }

  @ApiOkResponse({ type: RankingViewDto })
  @Get('me/:albumId')
  async getMine(
    @Param('albumId') albumId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.getRanking.byUserAndAlbum(user.sub, albumId);
  }

  @Public()
  @ApiOkResponse({ type: RankingViewDto })
  @Get('users/:userId/albums/:albumId')
  async getByUserAndAlbum(
    @Param('userId') userId: string,
    @Param('albumId') albumId: string,
  ) {
    return this.getRanking.byUserAndAlbum(userId, albumId);
  }

  @Public()
  @ApiOkResponse({ type: RankingViewDto })
  @Get(':rankingId')
  async getById(@Param('rankingId') rankingId: string) {
    return this.getRanking.byId(rankingId);
  }

  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: RankingViewDto })
  @Patch(':rankingId/tracks/:trackId')
  async rate(
    @Param('rankingId') rankingId: string,
    @Param('trackId') trackId: string,
    @Body() dto: RateTrackDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.rateTrack.execute({
      rankingId,
      trackId,
      score: dto.score,
      requestingUserId: user.sub,
    });
  }

  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: RankingViewDto })
  @Patch(':rankingId/tracks/:trackId/ignore')
  async ignore(
    @Param('rankingId') rankingId: string,
    @Param('trackId') trackId: string,
    @Body() dto: SetTrackIgnoredDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.setTrackIgnored.execute({
      rankingId,
      trackId,
      ignored: dto.ignored,
      requestingUserId: user.sub,
    });
  }

  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: RankingViewDto })
  @Patch(':rankingId/review')
  async review(
    @Param('rankingId') rankingId: string,
    @Body() dto: SaveReviewDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.saveReview.execute({
      rankingId,
      requestingUserId: user.sub,
      ...dto,
    });
  }

  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: RankingViewDto })
  @Post(':rankingId/reset')
  async reset(
    @Param('rankingId') rankingId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.resetRanking.execute({ rankingId, requestingUserId: user.sub });
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':rankingId')
  async remove(
    @Param('rankingId') rankingId: string,
    @CurrentUser() user: { sub: string },
  ) {
    await this.deleteRanking.execute({ rankingId, requestingUserId: user.sub });
  }
}
