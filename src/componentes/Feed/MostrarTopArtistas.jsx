import { useState, useEffect } from "react";
import { buscarArtista } from "../../services/spotify";
import ListaAlbuns from "./ListaAlbuns";
import { useTranslation } from "react-i18next";
import { MdReportProblem } from "react-icons/md";
import { BsGrid3X3GapFill, BsListUl } from "react-icons/bs";

/**
 * Componente para exibir os artistas encontrados na pesquisa
 * @param {Object} props - Propriedades do componente
 * @param {string} props.termoPesquisa - Termo de pesquisa do artista
 */
const MostrarTopArtistas = ({ termoPesquisa }) => {
  const [artistas, setArtistas] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [artistaSelecionado, setArtistaSelecionado] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  // Inicializar o estado de visualização a partir do localStorage ou definir 'grade' como padrão
  const [modoVisualizacao, setModoVisualizacao] = useState(() => {
    const preferenciaUsuario = localStorage.getItem(
      "preferenciaModoVisualizacao"
    );
    return preferenciaUsuario || "grade"; // 'grade' ou 'lista'
  });
  const [fade, setFade] = useState(true);
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

  // Padronização da função de alternância de modo de visualização
  const alternarModoVisualizacao = () => {
    setFade(false);
    setTimeout(() => {
      setModoVisualizacao(modoVisualizacao === "grade" ? "lista" : "grade");
      setFade(true);
    }, 300);
    localStorage.setItem(
      "preferenciaModoVisualizacao",
      modoVisualizacao === "grade" ? "lista" : "grade"
    );
  };

  // Buscar artistas quando o termo de pesquisa mudar
  useEffect(() => {
    const buscarDadosArtista = async () => {
      if (termoPesquisa && termoPesquisa.trim() !== "") {
        try {
          setCarregando(true);
          const dadosArtista = await buscarArtista(termoPesquisa);
          setArtistas(dadosArtista);
          setArtistaSelecionado(null); // Resetar artista selecionado quando buscar novo artista
        } catch (erro) {
          console.error("Erro ao buscar artista:", erro);
        } finally {
          setCarregando(false);
        }
      } else {
        // Se o termo de pesquisa estiver vazio, limpar os resultados
        setArtistas(null);
      }
    };

    buscarDadosArtista();
  }, [termoPesquisa]);

  // Quando um artista é selecionado, mostra seus álbuns
  if (artistaSelecionado) {
    return (
      <ListaAlbuns
        artistaId={artistaSelecionado}
        onVoltar={() => setArtistaSelecionado(null)}
      />
    );
  }

  // Determinar o número de colunas com base na largura da tela
  const getGridCols = () => {
    if (windowWidth < 550) return 2; // 2 artistas por linha em telas menores que 550px
    if (windowWidth < 1100) return 2; // 2 artistas por linha em telas menores que 1100px
    if (windowWidth < 1500) return 3; // 3 artistas por linha em telas médias
    return 4; // 5 artistas por linha em telas grandes
  };

  const gridCols = getGridCols();

  return (
    <div className="p-6">
      <div
        className={`flex justify-between items-center mb-4 ${
          !artistas || !artistas.items || artistas.items.length === 0
            ? "md:justify-center"
            : ""
        }`}
      >
        <h1
          className={`text-2xl font-bold text-verde-destaque ${
            !artistas || !artistas.items || artistas.items.length === 0
              ? "text-center w-full md:text-left"
              : ""
          }`}
        >
          {t("artistSearch.title", "Pesquisar por Artista")}
        </h1>

        {/* Botão para alternar modo de visualização, visível apenas se houver resultados */}
        {artistas && artistas.items && artistas.items.length > 0 && (
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
      ) : artistas && artistas.items && artistas.items.length > 0 ? (
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
              {artistas.items.slice(0, 10).map((artista) => (
                <div
                  key={artista.id}
                  className="bg-cinza-escuro rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex flex-col h-full cursor-pointer relative hover:bg-cinza-escuro/90 group p-3"
                  onClick={() => setArtistaSelecionado(artista.id)}
                >
                  {/* Imagem do artista */}
                  <div className="w-full aspect-square bg-cinza-escuro rounded-lg overflow-hidden mb-3">
                    {artista.images && artista.images.length > 0 ? (
                      <img
                        src={artista.images[0].url}
                        alt={t("artistSearch.photoAlt", {
                          artistName: artista.name,
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

                  {/* Informações do artista */}
                  <h3 className="font-bold text-sm md:text-base line-clamp-2 text-white mb-1">
                    {windowWidth < 600 &&
                    artista.name &&
                    artista.name.length > 28
                      ? artista.name.substring(0, 25) + "..."
                      : artista.name}
                  </h3>
                  <p className="text-xs text-gray-400 mb-2">
                    {t("artistSearch.followers", "Seguidores: {{count}}", {
                      count: artista.followers?.total.toLocaleString(),
                    })}
                  </p>

                  {/* Botão de ação */}
                  <button
                    className="mt-auto w-full bg-verde-destaque text-cinza-escuro py-1.5 px-3 rounded-lg hover:bg-verde-pastel transition-colors text-xs md:text-sm cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setArtistaSelecionado(artista.id);
                    }}
                  >
                    {t("artistSearch.viewAlbums", "Ver álbuns")}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            // Visualização em lista
            <div className="grid grid-cols-1 gap-3 md:gap-4">
              {artistas.items.slice(0, 10).map((artista) => (
                <div
                  key={artista.id}
                  className="bg-cinza-escuro rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex flex-col h-full cursor-pointer relative hover:bg-cinza-escuro/90 group"
                  onClick={() => setArtistaSelecionado(artista.id)}
                  title={t(
                    "artistSearch.clickToSeeAlbums",
                    "Clique para ver os álbuns"
                  )}
                >
                  <div className="flex h-full py-3 px-2 md:py-3 md:px-4 lg:py-4 items-center">
                    {/* Imagem do artista */}
                    <div className="flex-shrink-0 w-16 h-16 md:w-18 md:h-18 lg:w-20 lg:h-20 bg-cinza-escuro rounded-lg overflow-hidden mx-2 flex items-center justify-center">
                      {artista.images && artista.images.length > 0 ? (
                        <img
                          src={artista.images[0].url}
                          alt={t("artistSearch.photoAlt", {
                            artistName: artista.name,
                          })}
                          className="w-full h-full object-cover rounded-lg"
                          loading="lazy"
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.parentElement.classList.add(
                              "flex",
                              "items-center",
                              "justify-center",
                              "bg-cinza-escuro"
                            );
                            const fallbackIcon = document.createElement("div");
                            fallbackIcon.innerHTML =
                              '<div class="text-red-500 text-3xl"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0z"></path><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path></svg></div>';
                            e.target.parentElement.appendChild(fallbackIcon);
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-cinza-escuro rounded-lg">
                          <MdReportProblem className="text-red-500 text-3xl md:text-4xl" />
                        </div>
                      )}
                    </div>

                    {/* Informações do artista */}
                    <div className="flex-grow min-w-0 mx-2 flex flex-col justify-center">
                      <div className="flex flex-row items-center justify-between w-full gap-2">
                        <div className="flex flex-col min-w-0 flex-1">
                          <h3 className="font-bold text-sm md:text-base lg:text-lg line-clamp-1 text-white truncate pr-1">
                            {windowWidth < 600 &&
                            artista.name &&
                            artista.name.length > 28
                              ? artista.name.substring(0, 25) + "..."
                              : artista.name}
                          </h3>
                          <p className="text-xs md:text-sm text-gray-400 font-medium truncate pr-1 mt-1 md:mt-0">
                            {t(
                              "artistSearch.followers",
                              "Seguidores: {{count}}",
                              {
                                count:
                                  artista.followers?.total.toLocaleString(),
                              }
                            )}
                          </p>
                        </div>
                        <button
                          className="bg-verde-destaque text-cinza-escuro py-1 px-3 rounded-lg hover:bg-verde-pastel transition-colors text-xs md:text-sm cursor-pointer font-semibold shadow-sm max-w-[120px] md:max-w-none truncate"
                          onClick={(e) => {
                            e.stopPropagation();
                            setArtistaSelecionado(artista.id);
                          }}
                        >
                          {t("artistSearch.viewAlbums", "Ver álbuns")}
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
          {t(
            "artistSearch.noResults",
            "Nenhum artista encontrado para '{{term}}'",
            { term: termoPesquisa }
          )}
        </p>
      ) : (
        <p className="text-center text-gray-400 text-lg md:text-left md:mx-0 md:text-lg mx-auto max-w-xs md:max-w-none">
          {t(
            "artistSearch.enterTerm",
            "Digite o nome de um artista para pesquisar"
          )}
        </p>
      )}
    </div>
  );
};

export default MostrarTopArtistas;
