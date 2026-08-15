import { Link } from "@tanstack/react-router";
import type { AlbumSummary } from "@/shared/api/types";
import { AlbumCoverCard } from "./AlbumCoverCard";

export function AlbumCard({ album }: { album: AlbumSummary }) {
  return (
    <Link
      // rota aninhada em /search — mantém "Pesquisar" ativo na sidebar ao entrar no álbum.
      to="/search/$albumId"
      params={{ albumId: album.spotifyId }}
      // mesmo cartão do Discover/Feed (ver DiscoverPage.tsx) — grade idêntica merece cartão idêntico.
      className="bg-cinza-escuro border border-white/5 rounded-xl hover:border-dourado/30 hover:bg-white/5 transition flex flex-col"
    >
      <AlbumCoverCard album={album} />
    </Link>
  );
}
