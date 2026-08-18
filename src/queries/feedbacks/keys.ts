import type { FeedbackStatus } from "@/shared/api/types";

export interface FeedbacksFilters {
  page: number;
  perPage: number;
  status?: FeedbackStatus;
}

export const feedbacksKeys = {
  all: ["feedbacks"] as const,
  lists: () => [...feedbacksKeys.all, "list"] as const,
  list: (filters: FeedbacksFilters) => [...feedbacksKeys.lists(), filters] as const,
  details: () => [...feedbacksKeys.all, "detail"] as const,
  detail: (id: string) => [...feedbacksKeys.details(), id] as const,
  unansweredCount: () => [...feedbacksKeys.all, "unanswered-count"] as const,
};
