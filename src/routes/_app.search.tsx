import { createFileRoute } from "@tanstack/react-router";
import { SearchPage } from "@/features/album-catalog/components/SearchPage";

export const Route = createFileRoute("/_app/search")({
  component: SearchPage,
});
