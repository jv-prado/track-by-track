import { createFileRoute } from "@tanstack/react-router";
import { DiscoverPage } from "@/features/discovery/components/DiscoverPage";

export const Route = createFileRoute("/_app/discover")({
  component: DiscoverPage,
});
