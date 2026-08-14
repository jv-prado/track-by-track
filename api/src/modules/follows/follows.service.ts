import { randomUUID } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserDirectoryService } from '../identity/application/services/user-directory.service';
import {
  NOTIFICATION_SENDER,
  type NotificationSender,
} from '../../shared/application/ports/notification-sender.port';
import { FollowSchemaClass } from './follow.schema';
import { CannotFollowSelfError } from './errors/cannot-follow-self.error';
import { UserToFollowNotFoundError } from './errors/user-to-follow-not-found.error';
import {
  Paginated,
  buildPaginationMeta,
  paginationSkip,
} from '../../shared/infrastructure/pagination';

export interface FollowUserItem {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  followedAt: string;
  /** Cadastro do usuário seguido/seguidor — não é a data do follow. */
  createdAt: string;
}

export interface FollowStats {
  followers: number;
  following: number;
  /** `false` para visitante não autenticado — a rota é pública. */
  isFollowing: boolean;
}

@Injectable()
export class FollowsService {
  constructor(
    @InjectModel(FollowSchemaClass.name)
    private readonly model: Model<FollowSchemaClass>,
    @Inject(UserDirectoryService)
    private readonly userDirectory: UserDirectoryService,
    @Inject(NOTIFICATION_SENDER)
    private readonly notifications: NotificationSender,
  ) {}

  /**
   * Idempotente por decisão: duplo clique no botão "seguir" é comum demais pra
   * responder 409. O índice único garante um registro só; o upsert absorve a
   * segunda chamada em vez de estourar.
   *
   * Devolve `true` só quando o follow nasceu agora — é o sinal que o chamador
   * usa pra não notificar duas vezes o mesmo seguidor.
   */
  async follow(followerId: string, followeeId: string): Promise<boolean> {
    if (followerId === followeeId) throw new CannotFollowSelfError();

    const followee = await this.userDirectory.getPublicProfile(followeeId);
    if (!followee) throw new UserToFollowNotFoundError();

    const result = await this.model
      .updateOne(
        { followerId, followeeId },
        { $setOnInsert: { _id: randomUUID(), createdAt: new Date() } },
        { upsert: true },
      )
      .exec();

    const created = result.upsertedCount === 1;
    // Só no vínculo novo: seguir de novo (duplo clique) não pode notificar duas vezes.
    if (created) {
      await this.notifications.newFollower({ followeeId, actorId: followerId });
    }
    return created;
  }

  /** Também idempotente: deixar de seguir quem não se segue não é erro. */
  async unfollow(followerId: string, followeeId: string): Promise<void> {
    await this.model.deleteOne({ followerId, followeeId }).exec();
  }

  async stats(userId: string, viewerId?: string): Promise<FollowStats> {
    const [followers, following, viewerFollow] = await Promise.all([
      this.model.countDocuments({ followeeId: userId }).exec(),
      this.model.countDocuments({ followerId: userId }).exec(),
      viewerId && viewerId !== userId
        ? this.model
            .exists({ followerId: viewerId, followeeId: userId })
            .then((doc) => doc !== null)
        : Promise.resolve(false),
    ]);

    return { followers, following, isFollowing: viewerFollow };
  }

  /** Ids que `userId` segue — é o que o feed personalizado filtra (`$in`). */
  async followeeIds(userId: string): Promise<string[]> {
    const docs = await this.model
      .find({ followerId: userId }, { followeeId: 1 })
      .lean()
      .exec();
    return docs.map((doc) => doc.followeeId);
  }

  listFollowers(
    userId: string,
    page: number,
    perPage: number,
  ): Promise<Paginated<FollowUserItem>> {
    return this.listSide(
      { followeeId: userId },
      (doc) => doc.followerId,
      page,
      perPage,
    );
  }

  listFollowing(
    userId: string,
    page: number,
    perPage: number,
  ): Promise<Paginated<FollowUserItem>> {
    return this.listSide(
      { followerId: userId },
      (doc) => doc.followeeId,
      page,
      perPage,
    );
  }

  private async listSide(
    filter: Record<string, string>,
    otherSide: (doc: FollowSchemaClass) => string,
    page: number,
    perPage: number,
  ): Promise<Paginated<FollowUserItem>> {
    const [docs, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(paginationSkip(page, perPage))
        .limit(perPage)
        .lean()
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    // Uma página tem no máximo 100 itens (teto do perPage), então resolver os
    // perfis em lote aqui é barato — e evita $lookup na coleção de usuários.
    const profiles = await Promise.all(
      docs.map((doc) => this.userDirectory.getPublicProfile(otherSide(doc))),
    );

    const data = docs.flatMap((doc, index) => {
      const profile = profiles[index];
      // Usuário apagado depois de seguir: some da lista em vez de virar item vazio.
      if (!profile) return [];
      return [
        {
          userId: profile.id,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          followedAt: doc.createdAt.toISOString(),
          createdAt: profile.createdAt,
        },
      ];
    });

    return { data, meta: buildPaginationMeta(page, perPage, total) };
  }
}
