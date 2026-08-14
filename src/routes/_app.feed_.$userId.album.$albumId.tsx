import { createFileRoute } from "@tanstack/react-router";
import { UserAlbumRankingPage } from "@/features/ranking/components/UserAlbumRankingPage";

// Mesma tela de /profile/$userId/album/$albumId, só que aninhada em /feed — é o
// que faz a sidebar manter "Feed" ativo ao entrar no álbum vindo de lá (ver
// AppSidebar). `feed_` (underscore) escapa o nesting sob _app.feed.tsx — essa
// rota não precisa do <Outlet/> de FeedPage, fica lado a lado dela.
export const Route = createFileRoute("/_app/feed_/$userId/album/$albumId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { userId, albumId } = Route.useParams();
  return <UserAlbumRankingPage userId={userId} albumId={albumId} />;
}
