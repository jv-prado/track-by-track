import { useState, useEffect } from "react";
import { buscarAlbunsPorArtista } from "../../services/spotify";
import DetalhesAlbum from "./DetalhesAlbum";

/**
 * Componente para exibir os álbuns de um artista
 * @param {Object} props - Propriedades do componente
 * @param {string} props.artistaId - ID do artista no Spotify
 * @param {Function} props.onVoltar - Função para voltar à tela anterior
 */
const ListaAlbuns = ({ artistaId, onVoltar }) => {
  const [albuns, setAlbuns] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [albumSelecionado, setAlbumSelecionado] = useState(null);

  useEffect(() => {
    const buscarDados = async () => {
      if (artistaId) {
        try {
          setCarregando(true);
          const dados = await buscarAlbunsPorArtista(artistaId);
          setAlbuns(dados);
        } catch (erro) {
          console.error("Erro ao buscar álbuns do artista:", erro);
        } finally {
          setCarregando(false);
        }
      }
    };

    buscarDados();
  }, [artistaId]);

  // Quando um álbum é selecionado, mostra seus detalhes
  if (albumSelecionado) {
    return (
      <DetalhesAlbum
        albumId={albumSelecionado}
        onVoltar={() => setAlbumSelecionado(null)}
      />
    );
  }

  return (
    <div className="p-6">
      <button
        onClick={onVoltar}
        className="mb-4 bg-cinza py-2 px-4 rounded-lg hover:bg-cinza-escuro transition-colors cursor-pointer"
      >
        Voltar para artistas
      </button>

      <h2 className="text-2xl font-bold mb-6 text-verde-destaque">
        Álbuns do Artista
      </h2>

      {carregando ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-verde-destaque"></div>
        </div>
      ) : albuns && albuns.items ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {albuns.items.map((album) => (
            <div
              key={album.id}
              className="flex flex-col bg-cinza-escuro rounded-xl p-4 hover:bg-cinza transition-all duration-300 transform hover:scale-105 cursor-pointer"
              onClick={() => setAlbumSelecionado(album.id)}
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
              <button
                className="mt-4 bg-verde-destaque text-cinza-escuro py-2 px-4 rounded-lg hover:bg-verde-pastel transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setAlbumSelecionado(album.id);
                }}
              >
                Ver faixas
              </button>
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
};

export default ListaAlbuns;
