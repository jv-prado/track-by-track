import { useState, useEffect } from "react";
import { buscarAlbunsPorArtista } from "../../services/spotify";
import DetalhesAlbum from "../DetalhesAlbum/DetalhesAlbum";
import { useTranslation } from "react-i18next";
import { BsGrid3X3GapFill, BsListUl } from "react-icons/bs";

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
  const [modoVisualizacao, setModoVisualizacao] = useState(() => {
    const preferenciaUsuario = localStorage.getItem(
      "preferenciaModoVisualizacao"
    );
    return preferenciaUsuario || "grade"; // 'grade' ou 'lista'
  });
  const [fade, setFade] = useState(true);
  const { t } = useTranslation();

  // Padronização da função de alternância de modo de visualização
  const alternarModoVisualizacao = () => {
    setFade(false);
    setTimeout(() => {
      setModoVisualizacao(modoVisualizacao === "grade" ? "lista" : "grade");
      setFade(true);
    }, 180);
    localStorage.setItem(
      "preferenciaModoVisualizacao",
      modoVisualizacao === "grade" ? "lista" : "grade"
    );
  };

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
  const getGridCols = () => {
    if (windowWidth < 550) return 2; // 2 itens por linha em telas menores que 550px
    if (windowWidth < 1100) return 2; // 2 itens por linha em telas menores que 1100px
    if (windowWidth < 1500) return 3; // 3 itens por linha em telas médias
    return 5; // 5 itens por linha em telas grandes
  };

  const gridCols = getGridCols();

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
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={onVoltar}
          className="bg-cinza py-2 px-4 rounded-lg hover:bg-cinza-escuro transition-colors cursor-pointer"
        >
          {t("artistAlbums.backToArtists", "Voltar para artistas")}
        </button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-verde-destaque">
          {t("artistAlbums.title", "Álbuns do Artista")}
        </h2>
        {albuns && albuns.items && albuns.items.length > 0 && (
          <button
            onClick={alternarModoVisualizacao}
            className="text-sm bg-verde-destaque/20 hover:bg-verde-destaque/30 text-verde-destaque px-3 py-1 rounded-full transition-colors hover:cursor-pointer flex items-center gap-2"
            title={
              modoVisualizacao === "grade"
                ? t("artistSearch.viewAsList", "Ver como lista")
                : t("artistSearch.viewAsGrid", "Ver como grade")
            }
          >
            {modoVisualizacao === "grade" ? (
              <BsListUl className="text-verde-destaque" />
            ) : (
              <BsGrid3X3GapFill className="text-verde-destaque" />
            )}
          </button>
        )}
      </div>

      {carregando ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-verde-destaque"></div>
        </div>
      ) : albuns && albuns.items ? (
        <div
          className={`transition-opacity duration-180 ${
            fade ? "opacity-100" : "opacity-0"
          }`}
        >
          {modoVisualizacao === "grade" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                gap: "1rem",
              }}
            >
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
            // Visualização em lista
            <div className="grid grid-cols-1 gap-3 md:gap-4">
              {albuns.items.map((album) => (
                <div
                  key={album.id}
                  className="bg-cinza-escuro rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex flex-col h-full cursor-pointer relative hover:bg-cinza-escuro/90 group"
                  onClick={() => setAlbumSelecionado(album.id)}
                  title={t("albumCard.viewTracks", "Ver faixas")}
                >
                  <div className="flex h-full py-3 px-2 md:py-3 md:px-4 lg:py-4 items-center">
                    {/* Imagem do álbum */}
                    <div className="flex-shrink-0 w-16 h-16 md:w-18 md:h-18 lg:w-20 lg:h-20 bg-cinza-escuro rounded-lg overflow-hidden mx-2">
                      {album.images && album.images.length > 0 ? (
                        <img
                          src={album.images[0].url}
                          alt={t("albumCard.coverAlt", {
                            albumName: album.name,
                          })}
                          className="w-full h-full object-cover rounded-lg"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-cinza-escuro rounded-lg">
                          <span className="text-verde-destaque text-3xl">
                            🎵
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Informações do álbum */}
                    <div className="flex-grow min-w-0 mx-2 flex flex-col justify-center">
                      <div className="flex flex-row items-center justify-between w-full gap-2">
                        <div className="flex flex-col min-w-0 flex-1">
                          <h3
                            className="font-bold text-sm md:text-base lg:text-lg line-clamp-1 text-white truncate pr-1"
                            title={album.name}
                          >
                            {album.name}
                          </h3>
                          <p className="text-verde-destaque text-xs md:text-sm font-medium truncate pr-1 mt-1 md:mt-0">
                            {album.artists.map((a) => a.name).join(", ")}
                          </p>
                          <div className="flex gap-2 text-xs text-gray-400 mt-1">
                            <span>
                              {new Date(album.release_date).getFullYear()}
                            </span>
                            <span>•</span>
                            <span>
                              {t("artistAlbums.tracks", "{{count}} faixas", {
                                count: album.total_tracks,
                              })}
                            </span>
                          </div>
                        </div>
                        <button
                          className="bg-verde-destaque text-cinza-escuro py-1 px-3 rounded-lg hover:bg-verde-pastel transition-colors text-xs md:text-sm cursor-pointer font-semibold shadow-sm max-w-[120px] md:max-w-none truncate"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAlbumSelecionado(album.id);
                          }}
                        >
                          {t("albumCard.viewTracks", "Ver faixas")}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
