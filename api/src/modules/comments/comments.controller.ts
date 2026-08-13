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
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../shared/infrastructure/decorators/public.decorator';
import { CurrentUser } from '../../shared/infrastructure/decorators/current-user.decorator';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dtos/create-comment.dto';
import { UpdateCommentDto } from './dtos/update-comment.dto';
import { ListCommentsQueryDto } from './dtos/list-comments-query.dto';

@ApiTags('comments')
@Controller()
export class CommentsController {
  constructor(
    @Inject(CommentsService) private readonly comments: CommentsService,
  ) {}

  @Post('rankings/:rankingId/comments')
  async create(
    @Param('rankingId') rankingId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.comments.create(rankingId, user.sub, dto.text);
  }

  @Public()
  @Get('rankings/:rankingId/comments')
  async list(
    @Param('rankingId') rankingId: string,
    @Query() query: ListCommentsQueryDto,
  ) {
    return this.comments.listByRanking(rankingId, query.page, query.perPage);
  }

  @HttpCode(HttpStatus.OK)
  @Patch('comments/:commentId')
  async update(
    @Param('commentId') commentId: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.comments.update(commentId, user.sub, dto.text);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('comments/:commentId')
  async remove(
    @Param('commentId') commentId: string,
    @CurrentUser() user: { sub: string },
  ) {
    await this.comments.delete(commentId, user.sub);
  }
}
