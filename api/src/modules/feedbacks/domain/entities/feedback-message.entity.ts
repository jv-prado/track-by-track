import { Entity } from '../../../../shared/kernel/entity';
import { UniqueEntityId } from '../../../../shared/kernel/unique-entity-id';

export interface FeedbackMessageProps {
  userId?: string;
  adminId?: string;
  message: string;
  createdAt: Date;
}

export class FeedbackMessage extends Entity<FeedbackMessageProps> {
  private constructor(props: FeedbackMessageProps, id?: UniqueEntityId) {
    super(props, id);
  }

  static create(
    props: {
      userId?: string;
      adminId?: string;
      message: string;
      createdAt?: Date;
    },
    id?: UniqueEntityId,
  ): FeedbackMessage {
    return new FeedbackMessage(
      {
        userId: props.userId,
        adminId: props.adminId,
        message: props.message,
        createdAt: props.createdAt ?? new Date(),
      },
      id,
    );
  }

  static reconstitute(
    props: FeedbackMessageProps,
    id: UniqueEntityId,
  ): FeedbackMessage {
    return new FeedbackMessage(
      {
        ...props,
        createdAt:
          props.createdAt instanceof Date
            ? props.createdAt
            : new Date(props.createdAt ?? Date.now()),
      },
      id,
    );
  }

  get userId(): string | undefined {
    return this.props.userId;
  }

  get adminId(): string | undefined {
    return this.props.adminId;
  }

  get message(): string {
    return this.props.message;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get isAdmin(): boolean {
    return Boolean(this.props.adminId);
  }
}
