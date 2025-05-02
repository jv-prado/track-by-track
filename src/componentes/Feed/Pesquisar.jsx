import { useState, useEffect } from "react";
import { buscarAlbum } from "../../services/spotify";
import { buscarArtista } from "../../services/spotify";
import { buscarSingle } from "../../services/spotify";
import DetalhesAlbum from "./DetalhesAlbum";
import ListaAlbuns from "./ListaAlbuns";
import { MdMusicNote, MdReportProblem } from "react-icons/md";
import { FaUser } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { BsGrid3X3GapFill, BsListUl } from "react-icons/bs";

/**
 * Componente unificado para pesquisar artistas e álbuns
 * @param {Object} props - Propriedades do componente
 * @param {string} props.termoPesquisa - Termo de pesquisa
 */
const Pesquisar = ({ termoPesquisa }) => {
  const [resultados, setResultados] = useState(null);
  const [tipoConteudo, setTipoConteudo] = useState("albuns"); // albuns, singles ou artistas
  const [carregando, setCarregando] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState(null);
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

  // Alternar tipo de conteúdo e limpar seleção
  const alternarTipoConteudo = (tipo) => {
    if (tipo !== tipoConteudo) {
      setFade(false);
      setTimeout(() => {
        setTipoConteudo(tipo);
        setItemSelecionado(null);
        setFade(true);
      }, 180);
    }
  };

  // Efeito para buscar conteúdo quando o termo ou tipo mudar
  useEffect(() => {
    const buscarConteudo = async () => {
      if (termoPesquisa && termoPesquisa.trim() !== "") {
        try {
          setCarregando(true);

          if (tipoConteudo === "albuns") {
            const dadosAlbum = await buscarAlbum(termoPesquisa);
            setResultados(dadosAlbum);
          } else if (tipoConteudo === "singles") {
            const dadosSingle = await buscarSingle(termoPesquisa);
            setResultados(dadosSingle);
          } else {
            const dadosArtista = await buscarArtista(termoPesquisa);
            setResultados(dadosArtista);
          }

          setItemSelecionado(null); // Resetar item selecionado quando buscar novo conteúdo
        } catch (erro) {
          console.error(`Erro ao buscar ${tipoConteudo}:`, erro);
        } finally {
          setCarregando(false);
        }
      } else {
        // Se o termo de pesquisa estiver vazio, limpar os resultados
        setResultados(null);
      }
    };

    buscarConteudo();
  }, [termoPesquisa, tipoConteudo]);

  // Determinar o número de colunas com base na largura da tela
  const getGridCols = () => {
    if (windowWidth < 550) return 2; // 2 itens por linha em telas menores que 550px
    if (windowWidth < 1100) return 2; // 2 itens por linha em telas menores que 1100px
    if (windowWidth < 1500) return 3; // 3 itens por linha em telas médias
    return 4; // 4 itens por linha em telas grandes
  };

  const gridCols = getGridCols();

  // Renderizar componente de detalhes quando um álbum ou single for selecionado
  if (
    itemSelecionado &&
    (tipoConteudo === "albuns" || tipoConteudo === "singles")
  ) {
    return (
      <DetalhesAlbum
        albumId={itemSelecionado}
        onVoltar={() => setItemSelecionado(null)}
      />
    );
  }

  // Renderizar lista de álbuns quando um artista for selecionado
  if (itemSelecionado && tipoConteudo === "artistas") {
    return (
      <ListaAlbuns
        artistaId={itemSelecionado}
        onVoltar={() => setItemSelecionado(null)}
      />
    );
  }

  return (
    <div className="p-6">
      {/* Cabeçalho com botão de alternância de conteúdo */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-verde-destaque">
          {t("app.search")}
        </h1>

        <div className="flex items-center gap-2">
          {/* Botões para alternar entre tipos de conteúdo */}
          <div className="flex bg-cinza-escuro rounded-full p-1 mr-2">
            <button
              onClick={() => alternarTipoConteudo("albuns")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                tipoConteudo === "albuns"
                  ? "bg-verde-destaque text-gray-900"
                  : "text-gray-300 hover:text-verde-destaque"
              }`}
            >
              {t("app.albums")}
            </button>
            <button
              onClick={() => alternarTipoConteudo("singles")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                tipoConteudo === "singles"
                  ? "bg-verde-destaque text-gray-900"
                  : "text-gray-300 hover:text-verde-destaque"
              }`}
            >
              {t("app.singles", "Singles")}
            </button>
            <button
              onClick={() => alternarTipoConteudo("artistas")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                tipoConteudo === "artistas"
                  ? "bg-verde-destaque text-gray-900"
                  : "text-gray-300 hover:text-verde-destaque"
              }`}
            >
              {t("app.artists")}
            </button>
          </div>

          {/* Botão para alternar modo de visualização, visível apenas se houver resultados */}
          {resultados && resultados.items && resultados.items.length > 0 && (
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
      </div>

      {/* Conteúdo principal */}
      {carregando ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-verde-destaque"></div>
        </div>
      ) : resultados && resultados.items && resultados.items.length > 0 ? (
        <div
          className={`transition-opacity duration-180 ${
            fade ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* === Renderização modo GRADE === */}
          {modoVisualizacao === "grade" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                gap: "1rem",
              }}
            >
              {resultados.items.slice(0, 12).map((item) => (
                <div
                  key={item.id}
                  className="bg-cinza-escuro rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex flex-col h-full cursor-pointer relative hover:bg-cinza-escuro/90 group p-3"
                  onClick={() => setItemSelecionado(item.id)}
                  title={
                    tipoConteudo === "albuns" || tipoConteudo === "singles"
                      ? t("albumCard.viewTracks", "Ver faixas")
                      : t("artistSearch.clickToSeeAlbums", "Ver álbuns")
                  }
                >
                  {/* Imagem */}
                  <div className="aspect-square overflow-hidden rounded-lg mb-3 bg-cinza-escuro">
                    {tipoConteudo === "albuns" || tipoConteudo === "singles" ? (
                      // Imagem do álbum ou single
                      item.images && item.images.length > 0 ? (
                        <img
                          src={item.images[0].url}
                          alt={t("albumCard.coverAlt", {
                            albumName: item.name,
                          })}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MdMusicNote className="text-verde-destaque text-4xl" />
                        </div>
                      )
                    ) : // Imagem do artista
                    item.images && item.images.length > 0 ? (
                      <img
                        src={item.images[0].url}
                        alt={t("artistSearch.photoAlt", {
                          artistName: item.name,
                        })}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FaUser className="text-verde-destaque text-4xl" />
                      </div>
                    )}
                  </div>

                  {/* Nome e detalhes */}
                  <div className="flex flex-col flex-grow">
                    <h3
                      className="font-bold text-sm md:text-base line-clamp-1 text-white"
                      title={item.name}
                    >
                      {item.name}
                    </h3>

                    {/* Informações específicas por tipo */}
                    {tipoConteudo === "albuns" || tipoConteudo === "singles" ? (
                      <>
                        <p className="text-verde-destaque text-xs md:text-sm line-clamp-1 mb-2">
                          {item.artists && item.artists.length > 0
                            ? item.artists
                                .map((artist) => artist.name)
                                .join(", ")
                            : t(
                                "albumCard.unknownArtist",
                                "Artista desconhecido"
                              )}
                        </p>
                        {item.release_date && (
                          <span className="text-gray-400 text-xs">
                            {t("albumSearch.releaseYear", {
                              year: new Date(item.release_date).getFullYear(),
                            })}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        {item.followers && (
                          <span className="text-gray-400 text-xs mt-1">
                            {t("artistSearch.followers", {
                              count: item.followers.total.toLocaleString(),
                            })}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Botão de ação */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setItemSelecionado(item.id);
                    }}
                    className="mt-3 px-4 py-1.5 bg-verde-destaque text-cinza-escuro text-sm font-semibold rounded-lg hover:bg-verde-claro transition-colors w-full flex items-center justify-center"
                  >
                    {tipoConteudo === "albuns" || tipoConteudo === "singles"
                      ? t("albumSearch.viewTracks", "Avaliar")
                      : t("artistSearch.viewAlbums", "Ver álbuns")}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            // === Renderização modo LISTA ===
            <div className="grid grid-cols-1 gap-3 md:gap-4">
              {resultados.items.slice(0, 12).map((item) => (
                <div
                  key={item.id}
                  className="bg-cinza-escuro rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex flex-col h-full cursor-pointer relative hover:bg-cinza-escuro/90 group"
                  onClick={() => setItemSelecionado(item.id)}
                  title={
                    tipoConteudo === "albuns" || tipoConteudo === "singles"
                      ? t("albumCard.viewTracks", "Ver faixas")
                      : t("artistSearch.clickToSeeAlbums", "Ver álbuns")
                  }
                >
                  <div className="flex h-full py-3 px-4 items-center">
                    {/* Imagem */}
                    <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 bg-cinza-escuro rounded-lg overflow-hidden">
                      {tipoConteudo === "albuns" ||
                      tipoConteudo === "singles" ? (
                        // Imagem do álbum ou single
                        item.images && item.images.length > 0 ? (
                          <img
                            src={item.images[0].url}
                            alt={t("albumCard.coverAlt", {
                              albumName: item.name,
                            })}
                            className="w-full h-full object-cover rounded-lg"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center rounded-lg">
                            <MdMusicNote className="text-verde-destaque text-4xl" />
                          </div>
                        )
                      ) : // Imagem do artista
                      item.images && item.images.length > 0 ? (
                        <img
                          src={item.images[0].url}
                          alt={t("artistSearch.photoAlt", {
                            artistName: item.name,
                          })}
                          className="w-full h-full object-cover rounded-lg"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center rounded-lg">
                          <FaUser className="text-verde-destaque text-4xl" />
                        </div>
                      )}
                    </div>

                    {/* Informações */}
                    <div className="ml-4 flex-grow flex flex-col">
                      <h3 className="font-bold text-md md:text-lg text-white">
                        {item.name}
                      </h3>

                      {tipoConteudo === "albuns" ||
                      tipoConteudo === "singles" ? (
                        <>
                          <p className="text-verde-destaque text-sm">
                            {item.artists && item.artists.length > 0
                              ? item.artists
                                  .map((artist) => artist.name)
                                  .join(", ")
                              : t(
                                  "albumCard.unknownArtist",
                                  "Artista desconhecido"
                                )}
                          </p>
                          {item.release_date && (
                            <span className="text-gray-400 text-xs mt-1">
                              {t("albumSearch.releaseYear", {
                                year: new Date(item.release_date).getFullYear(),
                              })}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          {item.followers && (
                            <span className="text-gray-400 text-xs mt-1">
                              {t("artistSearch.followers", {
                                count: item.followers.total.toLocaleString(),
                              })}
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Botão de ação */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setItemSelecionado(item.id);
                      }}
                      className="ml-auto px-5 py-2 bg-verde-destaque text-cinza-escuro text-sm font-semibold rounded-lg hover:bg-verde-claro transition-colors"
                    >
                      {tipoConteudo === "albuns" || tipoConteudo === "singles"
                        ? t("albumSearch.viewTracks", "Avaliar")
                        : t("artistSearch.viewAlbums", "Ver álbuns")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : termoPesquisa ? (
        // Sem resultados para o termo pesquisado
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-cinza-escuro rounded-xl">
          <MdReportProblem className="text-amber-500 text-5xl mb-4" />
          <p className="text-gray-300 text-lg font-medium text-center">
            {tipoConteudo === "albuns"
              ? t("albumSearch.noAlbumsFound", "Nenhum álbum encontrado")
              : tipoConteudo === "singles"
              ? t("albumSearch.noSinglesFound", "Nenhum single encontrado")
              : t("artistSearch.noArtistsFound", "Nenhum artista encontrado")}
          </p>
          <p className="text-gray-500 mt-1 text-center max-w-md">
            {t(
              "searchPage.tryAnotherTerm",
              "Tente outro termo ou verifique se digitou corretamente"
            )}
          </p>
        </div>
      ) : (
        // Instrução para pesquisar
        <p className="text-center text-gray-400 text-lg md:text-left md:mx-0 md:text-lg mx-auto max-w-xs md:max-w-none">
          {tipoConteudo === "albuns"
            ? t(
                "albumSearch.typeToSearch",
                "Digite um nome de álbum na barra de pesquisa"
              )
            : tipoConteudo === "singles"
            ? t(
                "singleSearch.typeToSearch",
                "Digite um nome de single na barra de pesquisa"
              )
            : t(
                "artistSearch.typeToSearch",
                "Type an artist name in the search bar"
              )}
        </p>
      )}
    </div>
  );
};

export default Pesquisar;
