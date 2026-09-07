import { Mic2 } from "lucide-react";
import type { ArtistSummary } from "@/shared/api/types";

// gênero cru do Spotify vem tudo minúsculo ("glam", "brazilian hip hop") —
// exibição capitaliza cada palavra, sem tocar no valor usado como filtro.
function capitalizeGenre(genre: string): string {
  return genre.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * Artista não tem página própria (sem detalhe/ranking por artista) — clicar
 * joga o nome pra busca de álbuns, aba de verdade que leva a algo rankeável.
 */
export function ArtistCard({
  artist,
  onSelect,
}: {
  artist: ArtistSummary;
  onSelect: (artistName: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(artist.name)}
      className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-3 hover:bg-white/5 hover:border-white/10 transition text-left cursor-pointer"
    >
      {artist.imageUrl ?? artist.imageUrlSmall ? (
        <img
          src={artist.imageUrl ?? artist.imageUrlSmall}
          alt=""
          decoding="async"
          className="w-12 h-12 rounded-full object-cover shrink-0 ring-1 ring-white/10"
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-cinza-medio flex items-center justify-center shrink-0 ring-1 ring-white/10">
          <Mic2 size={18} className="text-gray-500" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-white text-sm font-medium truncate">{artist.name}</p>
        {artist.genres.length > 0 && (
          <p className="text-gray-500 text-xs mt-0.5 truncate">
            {artist.genres.slice(0, 3).map(capitalizeGenre).join(" · ")}
          </p>
        )}
      </div>
    </button>
  );
}
