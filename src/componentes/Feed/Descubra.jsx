import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { BsGrid3X3GapFill, BsListUl } from "react-icons/bs";
import { MdMusicNote, MdReportProblem } from "react-icons/md";
import { FaUser, FaFire } from "react-icons/fa";
import DetalhesAlbum from "./DetalhesAlbum";
import ListaAlbuns from "./ListaAlbuns";

/**
 * Componente para descobrir novos álbuns, artistas e singles
 * @returns {JSX.Element} Componente Descubra
 */
const Descubra = () => {
  const { t } = useTranslation();
  const [tipoConteudo, setTipoConteudo] = useState("albuns"); // albuns, singles ou artistas
  const [carregando, setCarregando] = useState(true);
  const [albunsPopulares, setAlbunsPopulares] = useState([]);
  const [artistasPopulares, setArtistasPopulares] = useState([]);
  const [singlesRecentes, setSinglesRecentes] = useState([]);
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [modoVisualizacao, setModoVisualizacao] = useState(() => {
    const preferenciaUsuario = localStorage.getItem(
      "preferenciaModoVisualizacao"
    );
    return preferenciaUsuario || "grade"; // 'grade' ou 'lista'
  });
  const [fade, setFade] = useState(true);

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

  // Função para alternar o modo de visualização
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

  // Determinar o número de colunas com base na largura da tela
  const getGridCols = () => {
    if (windowWidth < 550) return 2; // 2 itens por linha em telas menores que 550px
    if (windowWidth < 1100) return 2; // 2 itens por linha em telas menores que 1100px
    if (windowWidth < 1500) return 3; // 3 itens por linha em telas médias
    return 4; // 4 itens por linha em telas grandes
  };

  // Carregar dados
  useEffect(() => {
    const carregarDados = async () => {
      try {
        setCarregando(true);

        // Aqui você incluiria chamadas à API para buscar os dados reais
        // Por enquanto, vamos usar dados fictícios para demonstração

        // Simular álbuns populares
        setAlbunsPopulares([
          {
            id: "album1",
            name: "Album Popular 1",
            artists: [{ name: "Artista 1" }],
            images: [{ url: "https://via.placeholder.com/300" }],
            release_date: "2023-01-01",
          },
          {
            id: "album2",
            name: "Album Popular 2",
            artists: [{ name: "Artista 2" }],
            images: [{ url: "https://via.placeholder.com/300" }],
            release_date: "2023-02-15",
          },
          {
            id: "album3",
            name: "Album Popular 3",
            artists: [{ name: "Artista 3" }],
            images: [{ url: "https://via.placeholder.com/300" }],
            release_date: "2023-03-10",
          },
          {
            id: "album4",
            name: "Album Popular 4",
            artists: [{ name: "Artista 4" }],
            images: [{ url: "https://via.placeholder.com/300" }],
            release_date: "2023-04-20",
          },
        ]);

        // Simular artistas populares
        setArtistasPopulares([
          {
            id: "artista1",
            name: "Artista Popular 1",
            images: [{ url: "https://via.placeholder.com/300" }],
            followers: { total: 1000000 },
          },
          {
            id: "artista2",
            name: "Artista Popular 2",
            images: [{ url: "https://via.placeholder.com/300" }],
            followers: { total: 850000 },
          },
          {
            id: "artista3",
            name: "Artista Popular 3",
            images: [{ url: "https://via.placeholder.com/300" }],
            followers: { total: 750000 },
          },
          {
            id: "artista4",
            name: "Artista Popular 4",
            images: [{ url: "https://via.placeholder.com/300" }],
            followers: { total: 500000 },
          },
        ]);

        // Simular singles recentes
        setSinglesRecentes([
          {
            id: "single1",
            name: "Single Recente 1",
            artists: [{ name: "Artista 1" }],
            images: [{ url: "https://via.placeholder.com/300" }],
            release_date: "2023-05-01",
          },
          {
            id: "single2",
            name: "Single Recente 2",
            artists: [{ name: "Artista 2" }],
            images: [{ url: "https://via.placeholder.com/300" }],
            release_date: "2023-05-15",
          },
          {
            id: "single3",
            name: "Single Recente 3",
            artists: [{ name: "Artista 3" }],
            images: [{ url: "https://via.placeholder.com/300" }],
            release_date: "2023-06-01",
          },
          {
            id: "single4",
            name: "Single Recente 4",
            artists: [{ name: "Artista 4" }],
            images: [{ url: "https://via.placeholder.com/300" }],
            release_date: "2023-06-15",
          },
        ]);
      } catch (erro) {
        console.error("Erro ao carregar dados para Descubra:", erro);
      } finally {
        setCarregando(false);
      }
    };

    carregarDados();
  }, []);

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

  // Determinar qual lista de resultados mostrar com base no tipo de conteúdo
  let resultadosAtuais = [];
  if (tipoConteudo === "albuns") {
    resultadosAtuais = albunsPopulares;
  } else if (tipoConteudo === "singles") {
    resultadosAtuais = singlesRecentes;
  } else {
    resultadosAtuais = artistasPopulares;
  }

  return (
    <div className="p-6">
      {/* Cabeçalho com botão de alternância de conteúdo */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-verde-destaque flex items-center">
          <FaFire className="mr-2 text-orange-500" />
          {t("discover.title", "Descubra")}
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

          {/* Botão para alternar modo de visualização */}
          {resultadosAtuais && resultadosAtuais.length > 0 && (
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
      ) : resultadosAtuais && resultadosAtuais.length > 0 ? (
        <div
          className={`transition-opacity duration-180 ${
            fade ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* Título da seção */}
          <h2 className="text-xl font-semibold text-white mb-4">
            {tipoConteudo === "albuns"
              ? t("discover.popularAlbums", "Álbuns Populares")
              : tipoConteudo === "singles"
              ? t("discover.recentSingles", "Singles Recentes")
              : t("discover.popularArtists", "Artistas Populares")}
          </h2>

          {/* === Renderização modo GRADE === */}
          {modoVisualizacao === "grade" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                gap: "1rem",
              }}
            >
              {resultadosAtuais.map((item) => (
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
              {resultadosAtuais.map((item) => (
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
      ) : (
        // Mensagem quando não há resultados
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-cinza-escuro rounded-xl">
          <MdReportProblem className="text-amber-500 text-5xl mb-4" />
          <p className="text-gray-300 text-lg font-medium text-center">
            {t("discover.noContent", "Nenhum conteúdo disponível no momento")}
          </p>
          <p className="text-gray-500 mt-1 text-center max-w-md">
            {t("discover.tryLater", "Por favor, tente novamente mais tarde")}
          </p>
        </div>
      )}
    </div>
  );
};

export default Descubra;
