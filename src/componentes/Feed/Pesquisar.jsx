import { useState, useEffect, useRef } from "react";
import { buscarAlbum } from "../../services/spotify";
import { buscarArtista } from "../../services/spotify";
import { buscarSingle } from "../../services/spotify";
import DetalhesAlbum from "./DetalhesAlbum";
import ListaAlbuns from "./ListaAlbuns";
import { MdMusicNote, MdAlbum, MdReportProblem } from "react-icons/md";
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

  // Novos estados para rolagem infinita
  const [offset, setOffset] = useState(0);
  const [temMaisResultados, setTemMaisResultados] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const loaderRef = useRef(null);

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
      setTipoConteudo(tipo);
      setItemSelecionado(null);
      setFade(true);
      setOffset(0);
      setTemMaisResultados(true);
      setResultados(null);
    }
  };

  // Efeito para buscar conteúdo quando o termo ou tipo mudar (primeira página)
  useEffect(() => {
    const buscarConteudo = async () => {
      if (termoPesquisa && termoPesquisa.trim() !== "") {
        try {
          setCarregando(true);
          setOffset(0);
          setTemMaisResultados(true);

          if (tipoConteudo === "albuns") {
            const dadosAlbum = await buscarAlbum(termoPesquisa, 20, 0);
            // Filtra álbuns com mais de 2 faixas
            if (dadosAlbum && dadosAlbum.items) {
              dadosAlbum.items = dadosAlbum.items.filter(
                (item) => item.total_tracks > 2
              );
              setResultados(dadosAlbum);
              setTemMaisResultados(dadosAlbum.items.length === 20);
            } else {
              setResultados(dadosAlbum);
              setTemMaisResultados(false);
            }
          } else if (tipoConteudo === "singles") {
            const dadosSingle = await buscarSingle(termoPesquisa, 20, 0);
            // Filtra singles com exatamente 1 faixa
            if (dadosSingle && dadosSingle.items) {
              dadosSingle.items = dadosSingle.items.filter(
                (item) => item.total_tracks === 1
              );
              setResultados(dadosSingle);
              setTemMaisResultados(dadosSingle.items.length === 20);
            } else {
              setResultados(dadosSingle);
              setTemMaisResultados(false);
            }
          } else {
            const dadosArtista = await buscarArtista(termoPesquisa);
            setResultados(dadosArtista);
            setTemMaisResultados(false);
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
        setTemMaisResultados(false);
      }
    };

    buscarConteudo();
    // eslint-disable-next-line
  }, [termoPesquisa, tipoConteudo]);

  // Função para carregar mais resultados (rolagem infinita)
  const carregarMaisResultados = async () => {
    if (carregandoMais || !temMaisResultados) return;
    setCarregandoMais(true);
    const novoOffset = offset + 20;
    let novosResultados = null;

    if (tipoConteudo === "albuns") {
      novosResultados = await buscarAlbum(termoPesquisa, 20, novoOffset);
      if (novosResultados && novosResultados.items) {
        const antesDoFiltro = novosResultados.items.length;
        novosResultados.items = novosResultados.items.filter(
          (item) => item.total_tracks > 2
        );
        setResultados((prev) => ({
          ...prev,
          items: [...(prev?.items || []), ...novosResultados.items],
        }));
        setOffset(novoOffset);
        if (antesDoFiltro < 20) setTemMaisResultados(false);
      } else {
        setTemMaisResultados(false);
      }
    } else if (tipoConteudo === "singles") {
      novosResultados = await buscarSingle(termoPesquisa, 20, novoOffset);
      if (novosResultados && novosResultados.items) {
        const antesDoFiltro = novosResultados.items.length;
        novosResultados.items = novosResultados.items.filter(
          (item) => item.total_tracks === 1
        );
        setResultados((prev) => ({
          ...prev,
          items: [...(prev?.items || []), ...novosResultados.items],
        }));
        setOffset(novoOffset);
        if (antesDoFiltro < 20) setTemMaisResultados(false);
      } else {
        setTemMaisResultados(false);
      }
    }
    setCarregandoMais(false);
  };

  // IntersectionObserver para rolagem infinita
  useEffect(() => {
    if (carregandoMais) return;
    const observer = new window.IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && temMaisResultados) {
        carregarMaisResultados();
      }
    });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
    // eslint-disable-next-line
  }, [carregandoMais, temMaisResultados, resultados]);

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
      {/* Novo cabeçalho responsivo */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full gap-4 md:gap-0">
          <h1 className="text-2xl font-bold text-verde-destaque text-center md:text-left">
            {t("app.search")}
          </h1>
          <div className="flex flex-col md:flex-row items-center justify-center md:justify-between w-full md:w-auto mt-4 md:mt-0 gap-3 md:gap-0">
            {/* Linha centralizada no mobile: filtro centralizado, botão grade/lista à direita */}
            <div className="relative w-full md:w-auto flex flex-row items-center justify-center">
              {/* Filtros em linha */}
              <div className="flex flex-row items-center space-x-1 bg-gray-800 rounded-lg p-1 max-w-xs w-fit mx-auto md:mx-0">
                <button
                  onClick={() => alternarTipoConteudo("albuns")}
                  className={`px-3 py-1.5 rounded-md text-sm ${
                    tipoConteudo === "albuns"
                      ? "bg-verde-destaque text-black font-medium"
                      : "text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  <MdAlbum className="mr-1 inline-block" />
                  {t("app.albums")}
                </button>
                <span className="border-l border-gray-600 h-5 mx-1" />
                <button
                  onClick={() => alternarTipoConteudo("singles")}
                  className={`px-3 py-1.5 rounded-md text-sm ${
                    tipoConteudo === "singles"
                      ? "bg-verde-destaque text-black font-medium"
                      : "text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  <MdMusicNote className="mr-1 inline-block" />
                  {t("app.singles", "Singles")}
                </button>
                <span className="border-l border-gray-600 h-5 mx-1" />
                <button
                  onClick={() => alternarTipoConteudo("artistas")}
                  className={`px-3 py-1.5 rounded-md text-sm ${
                    tipoConteudo === "artistas"
                      ? "bg-verde-destaque text-black font-medium"
                      : "text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  <FaUser className="mr-1 inline-block" />
                  {t("app.artists")}
                </button>
              </div>
              {/* Botão de alternância de visualização (mobile) à direita */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 md:static md:translate-y-0 flex md:hidden">
                <button
                  onClick={alternarModoVisualizacao}
                  className="flex items-center justify-center px-2 py-1.5 h-10 rounded-md text-sm bg-gray-800 text-verde-destaque hover:bg-gray-700 transition-colors"
                  aria-label={
                    modoVisualizacao === "grade"
                      ? "Visualização em lista"
                      : "Visualização em grade"
                  }
                  title={
                    modoVisualizacao === "grade"
                      ? "Visualização em lista"
                      : "Visualização em grade"
                  }
                >
                  {modoVisualizacao === "grade" ? (
                    <BsListUl className="text-verde-destaque" />
                  ) : (
                    <BsGrid3X3GapFill className="text-verde-destaque" />
                  )}
                </button>
              </div>
            </div>
            {/* Desktop: dois botões on/off */}
            <div className="hidden md:flex space-x-1 bg-gray-800 rounded-lg p-1 ml-2 h-10 items-center">
              <button
                onClick={() => setModoVisualizacao("grade")}
                className={`px-2 py-1.5 h-8 rounded-md text-sm flex items-center justify-center transition-colors ${
                  modoVisualizacao === "grade"
                    ? "bg-gray-700 text-verde-destaque"
                    : "text-gray-300 hover:bg-gray-700"
                }`}
                aria-label="Visualização em grade"
                title="Visualização em grade"
              >
                <BsGrid3X3GapFill />
              </button>
              <button
                onClick={() => setModoVisualizacao("lista")}
                className={`px-2 py-1.5 h-8 rounded-md text-sm flex items-center justify-center transition-colors ${
                  modoVisualizacao === "lista"
                    ? "bg-gray-700 text-verde-destaque"
                    : "text-gray-300 hover:bg-gray-700"
                }`}
                aria-label="Visualização em lista"
                title="Visualização em lista"
              >
                <BsListUl />
              </button>
            </div>
          </div>
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
              {resultados.items.map((item) => (
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
              {temMaisResultados && (
                <div
                  ref={loaderRef}
                  className="w-full flex justify-center py-4"
                >
                  {carregandoMais ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-verde-destaque"></div>
                  ) : (
                    <span className="text-gray-500 text-sm">
                      Role para carregar mais...
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            // === Renderização modo LISTA ===
            <div className="grid grid-cols-1 gap-3 md:gap-4">
              {resultados.items.map((item) => (
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
              {temMaisResultados && (
                <div
                  ref={loaderRef}
                  className="w-full flex justify-center py-4"
                >
                  {carregandoMais ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-verde-destaque"></div>
                  ) : (
                    <span className="text-gray-500 text-sm">
                      Role para carregar mais...
                    </span>
                  )}
                </div>
              )}
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
