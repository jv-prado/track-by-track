import { useState, useEffect } from "react";
import { buscarAlbunsPorArtista } from "../../services/spotify";
import DetalhesAlbum from "./DetalhesAlbum";
import { useTranslation } from "react-i18next";

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
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const { t } = useTranslation();

  // Atualizar largura da janela quando ela for redimensionada
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

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

  // Determinar o número de colunas com base na largura da tela (igual ao MostrarTopArtistas)
  const getGridColsClass = () => {
    if (windowWidth < 550) return "grid-cols-2"; // 2 itens por linha em telas menores que 550px
    if (windowWidth < 1100) return "grid-cols-2"; // 2 itens por linha em telas menores que 1100px
    if (windowWidth < 1280) return "grid-cols-3"; // lg
    if (windowWidth < 1536) return "grid-cols-4"; // xl
    return "grid-cols-5"; // 2xl
  };

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
        {t("artistAlbums.backToArtists", "Voltar para artistas")}
      </button>

      <h2 className="text-2xl font-bold mb-6 text-verde-destaque">
        {t("artistAlbums.title", "Álbuns do Artista")}
      </h2>

      {carregando ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-verde-destaque"></div>
        </div>
      ) : albuns && albuns.items ? (
        <div className={`grid ${getGridColsClass()} gap-4 md:gap-6 lg:gap-8`}>
          {albuns.items.map((album) => (
            <div
              key={album.id}
              className="flex flex-col bg-cinza-escuro rounded-xl p-4 hover:bg-cinza transition-all duration-300 transform hover:scale-105 cursor-pointer"
              onClick={() => setAlbumSelecionado(album.id)}
            >
              {album.images && album.images.length > 0 && (
                <div className="w-full aspect-square mb-4">
                  <img
                    src={album.images[0].url}
                    alt={t(
                      "albumCard.coverAlt",
                      "Capa do álbum {{albumName}}",
                      { albumName: album.name }
                    )}
                    className="w-full h-full object-cover rounded-lg shadow-lg"
                  />
                </div>
              )}
              <h3 className="font-bold text-lg mb-2 line-clamp-2">
                {album.name}
              </h3>
              <p className="text-verde-destaque mb-1">
                {album.artists.map((a) => a.name).join(", ")}
              </p>
              <p className="text-sm text-gray-400">
                {t("albumSearch.releaseYear", "Lançamento: {{year}}", {
                  year: new Date(album.release_date).getFullYear(),
                })}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {t("artistAlbums.tracks", "Faixas: {{count}}", {
                  count: album.total_tracks,
                })}
              </p>
              <button
                className="mt-4 bg-verde-destaque text-cinza-escuro py-2 px-4 rounded-lg hover:bg-verde-pastel transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setAlbumSelecionado(album.id);
                }}
              >
                {t("albumCard.viewTracks", "Ver faixas")}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-400 text-lg">
          {t(
            "artistAlbums.noAlbumsFound",
            "Nenhum álbum encontrado para este artista"
          )}
        </p>
      )}
    </div>
  );
};

export default ListaAlbuns;
