import { randomUUID } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserDirectoryService } from '../identity/application/services/user-directory.service';
import { RankingDirectoryService } from '../ranking/application/services/ranking-directory.service';
import {
  NOTIFICATION_SENDER,
  type NotificationSender,
} from '../../shared/application/ports/notification-sender.port';
import { CommentSchemaClass } from './comment.schema';
import { CommentNotFoundError } from './errors/comment-not-found.error';
import { CommentForbiddenError } from './errors/comment-forbidden.error';
import {
  Paginated,
  buildPaginationMeta,
  paginationSkip,
} from '../../shared/infrastructure/pagination';

export interface CommentView {
  id: string;
  rankingId: string;
  authorId: string;
  authorDisplayName: string;
  authorAvatarUrl?: string;
  text: string;
  createdAt: string;
  editedAt: string | null;
}

function toView(doc: {
  _id: string;
  rankingId: string;
  authorId: string;
  authorDisplayName: string;
  authorAvatarUrl?: string;
  text: string;
  createdAt: Date;
  editedAt: Date | null;
}): CommentView {
  return {
    id: doc._id,
    rankingId: doc.rankingId,
    authorId: doc.authorId,
    authorDisplayName: doc.authorDisplayName,
    authorAvatarUrl: doc.authorAvatarUrl,
    text: doc.text,
    createdAt: doc.createdAt.toISOString(),
    editedAt: doc.editedAt ? doc.editedAt.toISOString() : null,
  };
}

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(CommentSchemaClass.name)
    private readonly model: Model<CommentSchemaClass>,
    @Inject(UserDirectoryService)
    private readonly userDirectory: UserDirectoryService,
    @Inject(RankingDirectoryService)
    private readonly rankingDirectory: RankingDirectoryService,
    @Inject(NOTIFICATION_SENDER)
    private readonly notifications: NotificationSender,
  ) {}

  async create(
    rankingId: string,
    authorId: string,
    text: string,
  ): Promise<CommentView> {
    const author = await this.userDirectory.getPublicProfile(authorId);
    const doc = await this.model.create({
      _id: randomUUID(),
      rankingId,
      authorId,
      authorDisplayName: author?.displayName ?? 'Usuário',
      authorAvatarUrl: author?.avatarUrl,
      text,
      createdAt: new Date(),
      editedAt: null,
    });

    // Depois de gravar: o comentário é o que precisa dar certo, a notificação é
    // consequência. O port engole a própria falha (ver notification-sender.port).
    const owner = await this.rankingDirectory.getOwner(rankingId);
    if (owner) {
      await this.notifications.commentOnRanking({
        rankingOwnerId: owner.userId,
        actorId: authorId,
        rankingId,
        albumId: owner.albumId,
      });
    }

    return toView(doc.toObject());
  }

  async listByRanking(
    rankingId: string,
    page: number,
    perPage: number,
  ): Promise<Paginated<CommentView>> {
    const [docs, total] = await Promise.all([
      this.model
        .find({ rankingId })
        .sort({ createdAt: -1 })
        .skip(paginationSkip(page, perPage))
        .limit(perPage)
        .lean()
        .exec(),
      this.model.countDocuments({ rankingId }).exec(),
    ]);
    return {
      data: docs.map(toView),
      meta: buildPaginationMeta(page, perPage, total),
    };
  }

  async update(
    commentId: string,
    requestingUserId: string,
    text: string,
  ): Promise<CommentView> {
    const doc = await this.model.findById(commentId).exec();
    if (!doc) throw new CommentNotFoundError();
    if (doc.authorId !== requestingUserId) throw new CommentForbiddenError();

    doc.text = text;
    doc.editedAt = new Date();
    await doc.save();
    return toView(doc.toObject());
  }

  async delete(commentId: string, requestingUserId: string): Promise<void> {
    const doc = await this.model.findById(commentId).exec();
    if (!doc) throw new CommentNotFoundError();
    if (doc.authorId !== requestingUserId) throw new CommentForbiddenError();

    await this.model.deleteOne({ _id: commentId }).exec();
  }
}
