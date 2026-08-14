import {
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
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../shared/infrastructure/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { ListNotificationsQueryDto } from './dtos/list-notifications-query.dto';
import {
  NotificationsPageDto,
  UnreadCountDto,
} from './dtos/notification.responses';

/**
 * Todas as rotas são privadas e escopadas ao `sub` do token — nenhuma aceita
 * `userId` do cliente. Notificação é caixa de entrada: só o dono lê e marca.
 */
@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
  ) {}

  @ApiOkResponse({ type: NotificationsPageDto })
  @Get()
  async list(
    @Query() query: ListNotificationsQueryDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.notifications.list(user.sub, query.page, query.perPage);
  }

  @ApiOkResponse({ type: UnreadCountDto })
  @Get('unread-count')
  async unreadCount(@CurrentUser() user: { sub: string }) {
    return { count: await this.notifications.unreadCount(user.sub) };
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch(':notificationId/read')
  async markRead(
    @Param('notificationId') notificationId: string,
    @CurrentUser() user: { sub: string },
  ) {
    await this.notifications.markRead(notificationId, user.sub);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('read-all')
  async markAllRead(@CurrentUser() user: { sub: string }) {
    await this.notifications.markAllRead(user.sub);
  }
}
