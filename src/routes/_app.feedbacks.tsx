import { createFileRoute } from "@tanstack/react-router";
import { FeedbacksPage } from "@/features/feedbacks/components/FeedbacksPage";

export const Route = createFileRoute("/_app/feedbacks")({
  component: FeedbacksPage,
});
