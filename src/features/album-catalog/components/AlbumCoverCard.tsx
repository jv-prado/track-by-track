import { Music } from "lucide-react";
import type { AlbumSummary } from "@/shared/api/types";

/**
 * Conteúdo visual do cartão de álbum (capa + nome + artista + ano) — sem o
 * wrapper de navegação, pra poder entrar tanto num `<Link>` (grade de busca)
 * quanto num `<button>` de seleção (Gerar Posts, admin).
 */
export function AlbumCoverCard({ album }: { album: AlbumSummary }) {
  const year = album.releaseDate?.slice(0, 4);

  return (
    <>
      {album.imageUrl ?? album.imageUrlSmall ? (
        <img
          src={album.imageUrl ?? album.imageUrlSmall}
          alt=""
          decoding="async"
          className="object-cover shrink-0 bg-cinza-medio w-full aspect-square rounded-t-xl"
        />
      ) : (
        <div className="bg-cinza-medio flex items-center justify-center shrink-0 w-full aspect-square rounded-t-xl">
          <Music size={32} className="text-gray-500" />
        </div>
      )}
      <div className="min-w-0 p-3 sm:p-4 flex flex-col flex-1">
        <p className="text-white font-semibold text-base sm:text-lg leading-tight line-clamp-2">
          {album.name}
        </p>
        <p className="text-gray-400 text-sm truncate">{album.artist}</p>
        {year && <p className="text-gray-500 text-sm mt-auto pt-2">{year}</p>}
      </div>
    </>
  );
}
