import { randomUUID } from 'crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserDirectoryService } from '../identity/application/services/user-directory.service';
import type { NotificationSender } from '../../shared/application/ports/notification-sender.port';
import {
  NotificationSchemaClass,
  NotificationType,
} from './notification.schema';
import { NotificationNotFoundError } from './errors/notification-not-found.error';
import {
  Paginated,
  buildPaginationMeta,
  paginationSkip,
} from '../../shared/infrastructure/pagination';

export interface NotificationView {
  id: string;
  type: NotificationType;
  actorId: string;
  actorDisplayName: string;
  actorAvatarUrl?: string;
  rankingId?: string;
  albumId?: string;
  read: boolean;
  createdAt: string;
}

function toView(doc: NotificationSchemaClass): NotificationView {
  return {
    id: doc._id,
    type: doc.type,
    actorId: doc.actorId,
    actorDisplayName: doc.actorDisplayName,
    actorAvatarUrl: doc.actorAvatarUrl,
    rankingId: doc.rankingId,
    albumId: doc.albumId,
    read: doc.readAt !== null,
    createdAt: doc.createdAt.toISOString(),
  };
}

/**
 * Serviço do módulo **e** adapter do `NotificationSender` — os dois lados vivem
 * aqui porque são a mesma coleção; separar em duas classes só pra ter simetria
 * com o kernel seria cerimônia (regra 4.1 do CLAUDE.md).
 */
@Injectable()
export class NotificationsService implements NotificationSender {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(NotificationSchemaClass.name)
    private readonly model: Model<NotificationSchemaClass>,
    @Inject(UserDirectoryService)
    private readonly userDirectory: UserDirectoryService,
  ) {}

  // --- leitura (sempre escopada ao destinatário) ---------------------------

  async list(
    userId: string,
    page: number,
    perPage: number,
  ): Promise<Paginated<NotificationView>> {
    const [docs, total] = await Promise.all([
      this.model
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip(paginationSkip(page, perPage))
        .limit(perPage)
        .lean()
        .exec(),
      this.model.countDocuments({ userId }).exec(),
    ]);
    return {
      data: docs.map(toView),
      meta: buildPaginationMeta(page, perPage, total),
    };
  }

  async unreadCount(userId: string): Promise<number> {
    return this.model.countDocuments({ userId, readAt: null }).exec();
  }

  /**
   * Filtra por `_id` **e** `userId` na mesma query: marcar como lida a
   * notificação de outro usuário não pode funcionar, e um `findById` seguido de
   * checagem abriria janela pra esquecer a checagem depois.
   */
  async markRead(notificationId: string, userId: string): Promise<void> {
    const result = await this.model
      .updateOne(
        { _id: notificationId, userId },
        { $set: { readAt: new Date() } },
      )
      .exec();
    if (result.matchedCount === 0) throw new NotificationNotFoundError();
  }

  async markAllRead(userId: string): Promise<void> {
    await this.model
      .updateMany({ userId, readAt: null }, { $set: { readAt: new Date() } })
      .exec();
  }

  // --- NotificationSender (emissão) ---------------------------------------

  async commentOnRanking(input: {
    rankingOwnerId: string;
    actorId: string;
    rankingId: string;
    albumId: string;
  }): Promise<void> {
    await this.create({
      userId: input.rankingOwnerId,
      type: 'comment',
      actorId: input.actorId,
      rankingId: input.rankingId,
      albumId: input.albumId,
    });
  }

  async newFollower(input: {
    followeeId: string;
    actorId: string;
  }): Promise<void> {
    await this.create({
      userId: input.followeeId,
      type: 'follow',
      actorId: input.actorId,
    });
  }

  private async create(input: {
    userId: string;
    type: NotificationType;
    actorId: string;
    rankingId?: string;
    albumId?: string;
  }): Promise<void> {
    // Ninguém quer ser avisado do que fez a si mesmo (comentar na própria review).
    if (input.userId === input.actorId) return;

    try {
      const actor = await this.userDirectory.getPublicProfile(input.actorId);
      await this.model.create({
        _id: randomUUID(),
        userId: input.userId,
        type: input.type,
        actorId: input.actorId,
        actorDisplayName: actor?.displayName ?? 'Usuário',
        actorAvatarUrl: actor?.avatarUrl,
        rankingId: input.rankingId,
        albumId: input.albumId,
        readAt: null,
        createdAt: new Date(),
      });
    } catch (error) {
      // Contrato do port: notificar nunca derruba a ação que a originou —
      // comentar tem que funcionar mesmo com esta coleção com problema.
      this.logger.warn(
        `Falha ao criar notificação ${input.type} para ${input.userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
