import { createFileRoute } from "@tanstack/react-router";
import { AlbumRatingView } from "@/shared/album/AlbumRatingView";

// Mesma tela de /album/$albumId, só que aninhada em /discover — é o que faz a
// sidebar manter "Descobrir" ativo ao entrar no álbum vindo dali (ver AppSidebar).
// `discover_` (underscore) escapa o nesting sob _app.discover.tsx — essa rota
// não precisa do <Outlet/> de DiscoverPage, fica lado a lado dela.
export const Route = createFileRoute("/_app/discover_/$albumId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { albumId } = Route.useParams();
  return <AlbumRatingView albumId={albumId} />;
}
