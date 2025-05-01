import { useState, useEffect } from "react";
import { buscarAlbum } from "../../services/spotify";
import DetalhesAlbum from "./DetalhesAlbum";
import { MdMusicNote, MdReportProblem } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { BsGrid3X3GapFill, BsListUl } from "react-icons/bs";

/**
 * Componente para exibir os álbuns encontrados na pesquisa
 * @param {Object} props - Propriedades do componente
 * @param {string} props.termoPesquisa - Termo de pesquisa do álbum
 */
const MostrarTopAlbuns = ({ termoPesquisa }) => {
  const [albuns, setAlbuns] = useState(null);
  const [carregando, setCarregando] = useState(false);
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

  // Buscar álbuns quando o termo de pesquisa mudar
  useEffect(() => {
    const buscarDadosAlbum = async () => {
      if (termoPesquisa && termoPesquisa.trim() !== "") {
        try {
          setCarregando(true);
          const dadosAlbum = await buscarAlbum(termoPesquisa);
          setAlbuns(dadosAlbum);
          setAlbumSelecionado(null); // Resetar álbum selecionado quando buscar novo álbum
        } catch (erro) {
          // Erro silencioso
        } finally {
          setCarregando(false);
        }
      }
    };

    buscarDadosAlbum();
  }, [termoPesquisa]);

  // Função para lidar com erro de carregamento de imagem
  const handleImageError = (e) => {
    e.target.style.display = "none";
    e.target.parentElement.classList.add(
      "flex",
      "items-center",
      "justify-center",
      "bg-cinza-escuro"
    );
    const fallbackIcon = document.createElement("div");
    fallbackIcon.className = "text-verde-destaque text-4xl";
    fallbackIcon.innerHTML = "<MdMusicNote />";
    e.target.parentElement.appendChild(fallbackIcon);
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

  // Determinar o número de colunas com base na largura da tela (similar a MinhasAvaliacoes.jsx)
  const getGridCols = () => {
    if (windowWidth < 550) return 2; // 2 álbuns por linha em telas menores que 550px
    if (windowWidth < 1100) return 2; // 2 álbuns por linha em telas menores que 1100px
    if (windowWidth < 1500) return 3; // 3 álbuns por linha em telas médias
    return 4; // 5 álbuns por linha em telas grandes
  };

  const gridCols = getGridCols();

  return (
    <div className="p-6">
      <div
        className={`flex justify-between items-center mb-4 ${
          !albuns || !albuns.items || albuns.items.length === 0
            ? "md:justify-center"
            : ""
        }`}
      >
        <h1
          className={`text-2xl font-bold text-verde-destaque ${
            !albuns || !albuns.items || albuns.items.length === 0
              ? "text-center w-full md:text-left"
              : ""
          }`}
        >
          {t("albumSearch.title", "Pesquisar por Álbum")}
        </h1>

        {/* Botão para alternar modo de visualização, visível apenas se houver resultados */}
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
      ) : albuns && albuns.items && albuns.items.length > 0 ? (
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
              {albuns.items.slice(0, 10).map((album) => (
                <div
                  key={album.id}
                  className="bg-cinza-escuro rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex flex-col h-full cursor-pointer relative hover:bg-cinza-escuro/90 group p-3"
                  onClick={() => setAlbumSelecionado(album.id)}
                >
                  {/* Imagem do álbum */}
                  <div className="w-full aspect-square bg-cinza-escuro rounded-lg overflow-hidden mb-3">
                    {album.images && album.images.length > 0 ? (
                      <img
                        src={album.images[0].url}
                        alt={t("albumCard.coverAlt", { albumName: album.name })}
                        className="w-full h-full object-cover rounded-lg"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-cinza-escuro rounded-lg">
                        <MdReportProblem className="text-red-500 text-3xl md:text-4xl" />
                      </div>
                    )}
                  </div>
                  {/* Informações do álbum */}
                  <h3
                    className="font-bold text-sm md:text-base line-clamp-2 text-white mb-1"
                    title={album.name}
                  >
                    {album.name}
                  </h3>
                  <p className="text-verde-destaque text-xs md:text-sm font-medium truncate pr-1 mb-2">
                    {album.artists[0].name}
                  </p>
                  <p className="text-xs text-gray-400 mb-2">
                    {t("albumSearch.releaseYear", "Lançamento: {{year}}", {
                      year: new Date(album.release_date).getFullYear(),
                    })}
                  </p>
                  <button
                    className="mt-auto w-full bg-verde-destaque text-cinza-escuro py-1.5 px-3 rounded-lg hover:bg-verde-pastel transition-colors text-xs md:text-sm cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAlbumSelecionado(album.id);
                    }}
                  >
                    {t("albumSearch.viewTracks", "Ver faixas")}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            // Visualização em lista
            <div className="grid grid-cols-1 gap-3 md:gap-4">
              {albuns.items.slice(0, 10).map((album) => (
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
                          <MdReportProblem className="text-red-500 text-3xl md:text-4xl" />
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
                            {album.artists[0].name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {t(
                              "albumSearch.releaseYear",
                              "Lançamento: {{year}}",
                              {
                                year: new Date(
                                  album.release_date
                                ).getFullYear(),
                              }
                            )}
                          </p>
                        </div>
                        <button
                          className="bg-verde-destaque text-cinza-escuro py-1 px-3 rounded-lg hover:bg-verde-pastel transition-colors text-xs md:text-sm cursor-pointer font-semibold shadow-sm max-w-[120px] md:max-w-none truncate"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAlbumSelecionado(album.id);
                          }}
                        >
                          {t("albumSearch.viewTracks", "Ver faixas")}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : termoPesquisa ? (
        <p className="text-center text-gray-400 text-lg">
          {t("albumSearch.noAlbumsFound", "Nenhum álbum encontrado")}
        </p>
      ) : (
        <p className="text-center text-gray-400 text-lg md:text-left md:mx-0 md:text-lg mx-auto max-w-xs md:max-w-none">
          {t(
            "albumSearch.typeToSearch",
            "Digite um nome de álbum na barra de pesquisa"
          )}
        </p>
      )}
    </div>
  );
};

export default MostrarTopAlbuns;
