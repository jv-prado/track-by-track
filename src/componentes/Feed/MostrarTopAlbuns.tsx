import { useState, useEffect } from "react";
import { buscarAlbunsPorArtista } from "../../services/spotify";

/**
 * Componente para exibir os álbuns de um artista específico
 * @param {string} artistaId - ID do artista no Spotify
 */
export default function MostrarTopAlbuns({ artistaId }) {
  const [albuns, setAlbuns] = useState(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const buscarDadosAlbuns = async () => {
      if (artistaId) {
        try {
          setCarregando(true);
          const dadosAlbuns = await buscarAlbunsPorArtista(artistaId);
          setAlbuns(dadosAlbuns);
        } catch (erro) {
          console.error("Erro ao buscar álbuns do artista:", erro);
        } finally {
          setCarregando(false);
        }
      }
    };

    buscarDadosAlbuns();
  }, [artistaId]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-verde-destaque">
        Álbuns do Artista
      </h2>

      {carregando ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-verde-destaque"></div>
        </div>
      ) : albuns ? (
        <div className="grid grid-cols-5 gap-8">
          {albuns.items.map((album) => (
            <div
              key={album.id}
              className="flex flex-col bg-cinza-escuro rounded-xl p-4 hover:bg-cinza transition-all duration-300 transform hover:scale-105 cursor-pointer"
            >
              {album.images && album.images.length > 0 && (
                <img
                  src={album.images[0].url}
                  alt={`Capa do álbum ${album.name}`}
                  className="w-full h-auto rounded-lg shadow-lg mb-4"
                />
              )}
              <h3 className="font-bold text-lg mb-2 line-clamp-2">
                {album.name}
              </h3>
              <p className="text-verde-destaque mb-1">
                {album.artists.map((a) => a.name).join(", ")}
              </p>
              <p className="text-sm text-gray-400">
                Lançamento: {new Date(album.release_date).getFullYear()}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Faixas: {album.total_tracks}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-400 text-lg">
          Nenhum álbum encontrado para este artista
        </p>
      )}
    </div>
  );
}
