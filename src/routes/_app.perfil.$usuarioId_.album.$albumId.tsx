import { createFileRoute } from "@tanstack/react-router";
import { UserAlbumRankingPage } from "@/features/ranking/components/UserAlbumRankingPage";

export const Route = createFileRoute("/_app/perfil/$usuarioId_/album/$albumId")({
  component: UserAlbumRankingPage,
});
