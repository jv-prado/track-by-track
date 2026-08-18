import { AggregateRoot } from '../../../../shared/kernel/aggregate-root';
import { UniqueEntityId } from '../../../../shared/kernel/unique-entity-id';
import { FeedbackMessage } from './feedback-message.entity';
import { InvalidFeedbackStatusError } from '../errors/invalid-feedback-status.error';

export type FeedbackStatus = 'open' | 'answered' | 'closed';

export const VALID_FEEDBACK_STATUSES: FeedbackStatus[] = [
  'open',
  'answered',
  'closed',
];

export interface FeedbackProps {
  userId: string;
  subject?: string;
  status: FeedbackStatus;
  messages: FeedbackMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFeedbackParams {
  userId: string;
  subject?: string;
  message: string;
}

export class Feedback extends AggregateRoot<FeedbackProps> {
  private constructor(props: FeedbackProps, id?: UniqueEntityId) {
    super(props, id);
  }

  static create(params: CreateFeedbackParams): Feedback {
    const now = new Date();
    const initialMessage = FeedbackMessage.create({
      userId: params.userId,
      message: params.message,
      createdAt: now,
    });

    return new Feedback({
      userId: params.userId,
      subject: params.subject?.trim() || undefined,
      status: 'open',
      messages: [initialMessage],
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: FeedbackProps, id: UniqueEntityId): Feedback {
    return new Feedback(
      {
        ...props,
        createdAt:
          props.createdAt instanceof Date
            ? props.createdAt
            : new Date(props.createdAt ?? Date.now()),
        updatedAt:
          props.updatedAt instanceof Date
            ? props.updatedAt
            : new Date(props.updatedAt ?? Date.now()),
      },
      id,
    );
  }

  get userId(): string {
    return this.props.userId;
  }

  get subject(): string | undefined {
    return this.props.subject;
  }

  get status(): FeedbackStatus {
    return this.props.status;
  }

  get messages(): readonly FeedbackMessage[] {
    return this.props.messages;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get lastMessage(): FeedbackMessage | undefined {
    const msgs = this.props.messages;
    return msgs.length > 0 ? msgs[msgs.length - 1] : undefined;
  }

  addMessage(
    author: { id: string; isAdmin: boolean },
    messageText: string,
  ): FeedbackMessage {
    const now = new Date();
    const message = FeedbackMessage.create({
      userId: author.isAdmin ? undefined : author.id,
      adminId: author.isAdmin ? author.id : undefined,
      message: messageText,
      createdAt: now,
    });

    this.props.messages.push(message);

    // Regra de transição de status:
    // Usuário responde -> status volta para 'open' (mesmo se estava 'answered' ou 'closed')
    // Admin responde -> status vai para 'answered'
    if (author.isAdmin) {
      this.props.status = 'answered';
    } else {
      this.props.status = 'open';
    }

    this.props.updatedAt = now;
    return message;
  }

  changeStatus(newStatus: FeedbackStatus): void {
    if (!VALID_FEEDBACK_STATUSES.includes(newStatus)) {
      throw new InvalidFeedbackStatusError(newStatus);
    }
    this.props.status = newStatus;
    this.props.updatedAt = new Date();
  }
}
