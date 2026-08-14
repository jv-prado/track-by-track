import { createFileRoute } from "@tanstack/react-router";
import { AlbumRatingView } from "@/shared/album/AlbumRatingView";

// Mesma tela de /album/$albumId, só que aninhada em /search — é o que faz a
// sidebar manter "Pesquisar" ativo ao entrar no álbum vindo dali (ver AppSidebar).
// `search_` (underscore) escapa o nesting sob _app.search.tsx — essa rota não
// precisa do <Outlet/> de SearchPage, fica lado a lado dela.
export const Route = createFileRoute("/_app/search_/$albumId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { albumId } = Route.useParams();
  return <AlbumRatingView albumId={albumId} />;
}
