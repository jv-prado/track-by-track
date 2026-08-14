import { createFileRoute } from "@tanstack/react-router";
import { UserAlbumRankingPage } from "@/features/ranking/components/UserAlbumRankingPage";

export const Route = createFileRoute("/_app/profile/$userId_/album/$albumId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { userId, albumId } = Route.useParams();
  return <UserAlbumRankingPage userId={userId} albumId={albumId} />;
}
