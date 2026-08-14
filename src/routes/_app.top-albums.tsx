import { createFileRoute } from "@tanstack/react-router";
import { TopAlbumsPage } from "@/features/discovery/components/TopAlbumsPage";

export const Route = createFileRoute("/_app/top-albums")({
  component: TopAlbumsPage,
});
