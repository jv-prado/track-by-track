import { createFileRoute } from "@tanstack/react-router";
import { FeedPage } from "@/features/discovery/components/FeedPage";

export const Route = createFileRoute("/_app/")({
  component: FeedPage,
});
