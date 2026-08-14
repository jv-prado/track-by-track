import { createFileRoute } from "@tanstack/react-router";
import { AlbumRatingView } from "@/shared/album/AlbumRatingView";

// Mesma tela de /album/$albumId, só que aninhada em /top-albums — é o que faz a
// sidebar manter "Top Álbuns" ativo ao entrar no álbum vindo dali (ver AppSidebar).
// `top-albums_` (underscore) escapa o nesting sob _app.top-albums.tsx — essa rota
// não precisa do <Outlet/> de TopAlbumsPage, fica lado a lado dela.
export const Route = createFileRoute("/_app/top-albums_/$albumId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { albumId } = Route.useParams();
  return <AlbumRatingView albumId={albumId} />;
}
