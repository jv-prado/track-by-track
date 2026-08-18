import { Inject, Injectable } from '@nestjs/common';
import {
  FEEDBACK_REPOSITORY,
  type FeedbackRepository,
} from '../domain/repositories/feedback.repository';
import {
  Feedback,
  FeedbackStatus,
} from '../domain/entities/feedback.aggregate';
import { FeedbackNotFoundError } from '../domain/errors/feedback-not-found.error';
import { FeedbackForbiddenError } from '../domain/errors/feedback-forbidden.error';
import { UserDirectoryService } from '../../identity/application/services/user-directory.service';
import {
  Paginated,
  buildPaginationMeta,
  paginationSkip,
} from '../../../shared/infrastructure/pagination';

export interface FeedbackMessageView {
  id: string;
  userId?: string;
  adminId?: string;
  authorDisplayName: string;
  authorAvatarUrl?: string;
  isAdmin: boolean;
  message: string;
  createdAt: string;
}

export interface FeedbackSummaryView {
  id: string;
  userId: string;
  userDisplayName: string;
  userAvatarUrl?: string;
  subject?: string;
  status: FeedbackStatus;
  messageCount: number;
  lastMessage: string;
  lastMessageCreatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackDetailView {
  id: string;
  userId: string;
  userDisplayName: string;
  userAvatarUrl?: string;
  subject?: string;
  status: FeedbackStatus;
  messages: FeedbackMessageView[];
  createdAt: string;
  updatedAt: string;
}

export interface UnansweredFeedbacksCountView {
  count: number;
}

@Injectable()
export class FeedbacksService {
  constructor(
    @Inject(FEEDBACK_REPOSITORY)
    private readonly feedbackRepo: FeedbackRepository,
    @Inject(UserDirectoryService)
    private readonly userDirectory: UserDirectoryService,
  ) {}

  async create(
    userId: string,
    subject: string,
    message: string,
  ): Promise<FeedbackDetailView> {
    const feedback = Feedback.create({
      userId,
      subject,
      message,
    });

    await this.feedbackRepo.save(feedback);
    return this.toDetailView(feedback);
  }

  async list(
    requestingUserId: string,
    page: number,
    perPage: number,
    status?: FeedbackStatus,
  ): Promise<Paginated<FeedbackSummaryView>> {
    const isAdmin = await this.userDirectory.isUserAdmin(requestingUserId);
    const limit = perPage;
    const offset = paginationSkip(page, perPage);

    const result = isAdmin
      ? await this.feedbackRepo.findAll(limit, offset, status)
      : await this.feedbackRepo.findByUser(
          requestingUserId,
          limit,
          offset,
          status,
        );

    const summaries = await Promise.all(
      result.items.map((feedback) => this.toSummaryView(feedback)),
    );

    return {
      data: summaries,
      meta: buildPaginationMeta(page, perPage, result.total),
    };
  }

  async getById(
    feedbackId: string,
    requestingUserId: string,
  ): Promise<FeedbackDetailView> {
    const feedback = await this.feedbackRepo.findById(feedbackId);
    if (!feedback) {
      throw new FeedbackNotFoundError();
    }

    const isAdmin = await this.userDirectory.isUserAdmin(requestingUserId);
    if (!isAdmin && feedback.userId !== requestingUserId) {
      throw new FeedbackForbiddenError();
    }

    return this.toDetailView(feedback);
  }

  async addMessage(
    feedbackId: string,
    requestingUserId: string,
    messageText: string,
  ): Promise<FeedbackDetailView> {
    const feedback = await this.feedbackRepo.findById(feedbackId);
    if (!feedback) {
      throw new FeedbackNotFoundError();
    }

    const isAdmin = await this.userDirectory.isUserAdmin(requestingUserId);
    if (!isAdmin && feedback.userId !== requestingUserId) {
      throw new FeedbackForbiddenError();
    }

    feedback.addMessage({ id: requestingUserId, isAdmin }, messageText);
    await this.feedbackRepo.save(feedback);

    return this.toDetailView(feedback);
  }

  async updateStatus(
    feedbackId: string,
    requestingUserId: string,
    status: FeedbackStatus,
  ): Promise<FeedbackDetailView> {
    const isAdmin = await this.userDirectory.isUserAdmin(requestingUserId);
    if (!isAdmin) {
      throw new FeedbackForbiddenError(
        'Apenas administradores podem alterar o status de um feedback.',
      );
    }

    const feedback = await this.feedbackRepo.findById(feedbackId);
    if (!feedback) {
      throw new FeedbackNotFoundError();
    }

    feedback.changeStatus(status);
    await this.feedbackRepo.save(feedback);

    return this.toDetailView(feedback);
  }

  async getUnansweredCount(
    requestingUserId: string,
  ): Promise<UnansweredFeedbacksCountView> {
    const isAdmin = await this.userDirectory.isUserAdmin(requestingUserId);
    if (!isAdmin) {
      return { count: 0 };
    }

    const count = await this.feedbackRepo.countUnanswered();
    return { count };
  }

  private toIso(date?: Date | string | null): string {
    if (!date) return new Date().toISOString();
    if (date instanceof Date) return date.toISOString();
    const parsed = new Date(date);
    return isNaN(parsed.getTime())
      ? new Date().toISOString()
      : parsed.toISOString();
  }

  private async toSummaryView(
    feedback: Feedback,
  ): Promise<FeedbackSummaryView> {
    const user = await this.userDirectory.getPublicProfile(feedback.userId);
    const lastMsg = feedback.lastMessage;

    return {
      id: feedback.id.toString(),
      userId: feedback.userId,
      userDisplayName: user?.displayName ?? 'Usuário',
      userAvatarUrl: user?.avatarUrl,
      subject: feedback.subject,
      status: feedback.status,
      messageCount: feedback.messages.length,
      lastMessage: lastMsg?.message ?? '',
      lastMessageCreatedAt: this.toIso(
        lastMsg?.createdAt ?? feedback.createdAt,
      ),
      createdAt: this.toIso(feedback.createdAt),
      updatedAt: this.toIso(feedback.updatedAt),
    };
  }

  private async toDetailView(feedback: Feedback): Promise<FeedbackDetailView> {
    const owner = await this.userDirectory.getPublicProfile(feedback.userId);

    // Carrega autores de cada mensagem
    const messages: FeedbackMessageView[] = await Promise.all(
      feedback.messages.map(async (msg) => {
        if (msg.isAdmin) {
          const adminProfile = msg.adminId
            ? await this.userDirectory.getPublicProfile(msg.adminId)
            : null;
          return {
            id: msg.id.toString(),
            userId: undefined,
            adminId: msg.adminId,
            authorDisplayName:
              adminProfile?.displayName ?? 'Admin (Track by Track)',
            authorAvatarUrl: adminProfile?.avatarUrl,
            isAdmin: true,
            message: msg.message,
            createdAt: this.toIso(msg.createdAt),
          };
        }

        const userProfile = msg.userId
          ? await this.userDirectory.getPublicProfile(msg.userId)
          : owner;

        return {
          id: msg.id.toString(),
          userId: msg.userId,
          adminId: undefined,
          authorDisplayName: userProfile?.displayName ?? 'Usuário',
          authorAvatarUrl: userProfile?.avatarUrl,
          isAdmin: false,
          message: msg.message,
          createdAt: this.toIso(msg.createdAt),
        };
      }),
    );

    return {
      id: feedback.id.toString(),
      userId: feedback.userId,
      userDisplayName: owner?.displayName ?? 'Usuário',
      userAvatarUrl: owner?.avatarUrl,
      subject: feedback.subject,
      status: feedback.status,
      messages,
      createdAt: this.toIso(feedback.createdAt),
      updatedAt: this.toIso(feedback.updatedAt),
    };
  }
}
