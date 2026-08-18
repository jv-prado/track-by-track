import { UniqueEntityId } from '../../../../shared/kernel/unique-entity-id';
import {
  Feedback,
  FeedbackProps,
} from '../../domain/entities/feedback.aggregate';
import { FeedbackMessage } from '../../domain/entities/feedback-message.entity';
import { FeedbackLean } from './feedback.schema';

export class FeedbackMapper {
  static toDomain(doc: FeedbackLean): Feedback {
    const messages = (doc.messages || []).map((msg) => {
      const msgCreatedAt =
        msg.createdAt instanceof Date
          ? msg.createdAt
          : msg.createdAt
            ? new Date(msg.createdAt)
            : new Date();

      return FeedbackMessage.reconstitute(
        {
          userId: msg.userId ? msg.userId.toString() : undefined,
          adminId: msg.adminId ? msg.adminId.toString() : undefined,
          message: msg.message,
          createdAt: msgCreatedAt,
        },
        new UniqueEntityId(msg._id ? msg._id.toString() : undefined),
      );
    });

    const docCreatedAt =
      doc.createdAt instanceof Date
        ? doc.createdAt
        : doc.createdAt
          ? new Date(doc.createdAt)
          : new Date();

    const docUpdatedAt =
      doc.updatedAt instanceof Date
        ? doc.updatedAt
        : doc.updatedAt
          ? new Date(doc.updatedAt)
          : new Date();

    const props: FeedbackProps = {
      userId: doc.userId.toString(),
      subject: doc.subject,
      status: doc.status,
      messages,
      createdAt: docCreatedAt,
      updatedAt: docUpdatedAt,
    };

    return Feedback.reconstitute(props, new UniqueEntityId(doc._id.toString()));
  }

  static toPersistence(feedback: Feedback) {
    return {
      _id: feedback.id.toString(),
      userId: feedback.userId,
      subject: feedback.subject,
      status: feedback.status,
      messages: feedback.messages.map((msg) => ({
        _id: msg.id.toString(),
        userId: msg.userId,
        adminId: msg.adminId,
        message: msg.message,
        createdAt: msg.createdAt,
      })),
      createdAt: feedback.createdAt,
      updatedAt: feedback.updatedAt,
    };
  }
}
