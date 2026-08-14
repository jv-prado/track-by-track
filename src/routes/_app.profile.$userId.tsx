import { createFileRoute } from "@tanstack/react-router";
import { PublicProfilePage } from "@/features/discovery/components/PublicProfilePage";

export const Route = createFileRoute("/_app/profile/$userId")({
  component: PublicProfilePage,
});
