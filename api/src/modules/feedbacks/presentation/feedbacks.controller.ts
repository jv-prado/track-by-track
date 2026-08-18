import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../shared/infrastructure/decorators/current-user.decorator';
import { FeedbacksService } from '../application/feedbacks.service';
import { CreateFeedbackDto } from './dtos/create-feedback.dto';
import { AddFeedbackMessageDto } from './dtos/add-feedback-message.dto';
import { UpdateFeedbackStatusDto } from './dtos/update-feedback-status.dto';
import { ListFeedbacksQueryDto } from './dtos/list-feedbacks-query.dto';
import {
  FeedbackDetailDto,
  FeedbacksPageDto,
  UnansweredFeedbacksCountDto,
} from './dtos/feedback.responses';

@ApiTags('feedbacks')
@ApiBearerAuth()
@Controller('feedbacks')
export class FeedbacksController {
  constructor(
    @Inject(FeedbacksService)
    private readonly feedbacksService: FeedbacksService,
  ) {}

  @ApiCreatedResponse({ type: FeedbackDetailDto })
  @Post()
  async create(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateFeedbackDto,
  ) {
    return this.feedbacksService.create(user.sub, dto.subject, dto.message);
  }

  @ApiOkResponse({ type: FeedbacksPageDto })
  @Get()
  async list(
    @CurrentUser() user: { sub: string },
    @Query() query: ListFeedbacksQueryDto,
  ) {
    return this.feedbacksService.list(
      user.sub,
      query.page,
      query.perPage,
      query.status,
    );
  }

  @ApiOkResponse({ type: UnansweredFeedbacksCountDto })
  @Get('unanswered-count')
  async getUnansweredCount(@CurrentUser() user: { sub: string }) {
    return this.feedbacksService.getUnansweredCount(user.sub);
  }

  @ApiOkResponse({ type: FeedbackDetailDto })
  @Get(':id')
  async getById(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.feedbacksService.getById(id, user.sub);
  }

  @ApiCreatedResponse({ type: FeedbackDetailDto })
  @Post(':id/messages')
  async addMessage(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: AddFeedbackMessageDto,
  ) {
    return this.feedbacksService.addMessage(id, user.sub, dto.message);
  }

  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: FeedbackDetailDto })
  @Patch(':id/status')
  async updateStatus(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: UpdateFeedbackStatusDto,
  ) {
    return this.feedbacksService.updateStatus(id, user.sub, dto.status);
  }
}
