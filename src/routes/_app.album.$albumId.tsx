import { createFileRoute } from "@tanstack/react-router";
import { AlbumDetailPage } from "@/features/album-catalog/components/AlbumDetailPage";

export const Route = createFileRoute("/_app/album/$albumId")({
  component: AlbumDetailPage,
});
