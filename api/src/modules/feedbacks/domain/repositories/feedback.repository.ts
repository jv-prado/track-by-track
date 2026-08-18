import { Feedback, FeedbackStatus } from '../entities/feedback.aggregate';

export const FEEDBACK_REPOSITORY = Symbol('FeedbackRepository');

export interface FeedbackSearchResult {
  items: Feedback[];
  total: number;
}

export interface FeedbackRepository {
  save(feedback: Feedback): Promise<void>;
  findById(id: string): Promise<Feedback | null>;
  findByUser(
    userId: string,
    limit: number,
    offset: number,
    status?: FeedbackStatus,
  ): Promise<FeedbackSearchResult>;
  findAll(
    limit: number,
    offset: number,
    status?: FeedbackStatus,
  ): Promise<FeedbackSearchResult>;
  countUnanswered(): Promise<number>;
}
