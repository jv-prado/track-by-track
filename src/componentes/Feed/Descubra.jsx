import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { BsGrid3X3GapFill, BsListUl } from "react-icons/bs";
import { MdMusicNote, MdReportProblem } from "react-icons/md";
import { FaUser, FaFire } from "react-icons/fa";
import DetalhesAlbum from "./DetalhesAlbum";
import ListaAlbuns from "./ListaAlbuns";
import {
  buscarNovosLancamentos,
  buscarSinglesRecentes,
  buscarArtistasPorGenero,
  buscarTopTracks,
  buscarDetalhesAlbum,
  buscarFaixasPorAlbum,
} from "../../services/spotify/index";

/**
 * Componente para descobrir novos álbuns, artistas e singles
 * @returns {JSX.Element} Componente Descubra
 */
const Descubra = ({ termoPesquisa }) => {
  const { t, i18n } = useTranslation();
  const [tipoConteudo, setTipoConteudo] = useState("albuns"); // albuns, singles ou artistas
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState(null);
  const [albunsPopulares, setAlbunsPopulares] = useState([]);
  const [albumsComDetalhes, setAlbumsComDetalhes] = useState([]);
  const [artistasPopulares, setArtistasPopulares] = useState([]);
  const [singlesRecentes, setSinglesRecentes] = useState([]);
  const [singlesComDetalhes, setSinglesComDetalhes] = useState([]);
  const [topTracks, setTopTracks] = useState([]);
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [offset, setOffset] = useState(0);
  const [temMaisAlbuns, setTemMaisAlbuns] = useState(true);
  const [paisUsuario, setPaisUsuario] = useState("BR");
  const [modoVisualizacao, setModoVisualizacao] = useState(() => {
    const preferenciaUsuario = localStorage.getItem(
      "preferenciaModoVisualizacao"
    );
    return preferenciaUsuario || "grade"; // 'grade' ou 'lista'
  });
  const [fade, setFade] = useState(true);

  // Referência para detectar quando chegamos ao final da página
  const observerRef = useRef(null);
  const loaderRef = useCallback(
    (node) => {
      if (carregandoMais) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (
          entries[0].isIntersecting &&
          temMaisAlbuns &&
          tipoConteudo === "albuns"
        ) {
          carregarMaisAlbuns();
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [carregandoMais, temMaisAlbuns, tipoConteudo]
  );

  // Determinar o país com base no navegador do usuário
  useEffect(() => {
    // Tentar obter país do usuário pelo navegador
    try {
      const linguagem = navigator.language || navigator.userLanguage || "en-US";
      const pais = linguagem.split("-")[1] || "BR";
      setPaisUsuario(pais);
    } catch (error) {
      console.warn("Não foi possível detectar o país do usuário:", error);
      setPaisUsuario("BR"); // País padrão
    }
  }, []);

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

  // Função para obter detalhes de um álbum, incluindo número de faixas
  const obterDetalhesAlbum = async (album) => {
    try {
      const detalhes = await buscarDetalhesAlbum(album.id);
      return {
        ...album,
        total_tracks: detalhes.total_tracks || 0,
      };
    } catch (error) {
      console.error(`Erro ao buscar detalhes do álbum ${album.id}:`, error);
      return {
        ...album,
        total_tracks: 0,
      };
    }
  };

  // Função para carregar mais álbuns com rolagem infinita
  const carregarMaisAlbuns = async () => {
    if (carregandoMais || !temMaisAlbuns) return;

    try {
      setCarregandoMais(true);
      const proximoOffset = offset + 20;

      const novosLancamentosResponse = await buscarNovosLancamentos(
        paisUsuario,
        20,
        proximoOffset
      );

      if (
        novosLancamentosResponse &&
        novosLancamentosResponse.albums &&
        novosLancamentosResponse.albums.items &&
        novosLancamentosResponse.albums.items.length > 0
      ) {
        // Obtém detalhes de cada novo álbum
        const detalhesPromises = novosLancamentosResponse.albums.items.map(
          (album) => obterDetalhesAlbum(album)
        );

        const novosAlbumsDetalhados = await Promise.all(detalhesPromises);

        // Filtra álbuns com mais de 5 faixas
        const novosFiltrados = novosAlbumsDetalhados.filter(
          (album) => album.total_tracks > 5
        );

        if (novosFiltrados.length > 0) {
          // Atualiza o estado adicionando os novos álbuns aos existentes
          setAlbumsComDetalhes((albunsAnteriores) => [
            ...albunsAnteriores,
            ...novosFiltrados,
          ]);

          setOffset(proximoOffset);
        } else {
          // Se não encontrou álbuns válidos neste lote, tentar próximo lote
          if (novosLancamentosResponse.albums.items.length === 20) {
            setOffset(proximoOffset);
            // Tenta novamente imediatamente para buscar o próximo lote
            setTimeout(carregarMaisAlbuns, 100);
          } else {
            setTemMaisAlbuns(false);
          }
        }

        // Se recebemos menos de 20 álbuns, provavelmente chegamos ao fim
        if (novosLancamentosResponse.albums.items.length < 20) {
          setTemMaisAlbuns(false);
        }
      } else {
        setTemMaisAlbuns(false);
      }
    } catch (error) {
      console.error("Erro ao carregar mais álbuns:", error);
    } finally {
      setCarregandoMais(false);
    }
  };

  // Carregar dados da API do Spotify
  useEffect(() => {
    const carregarDados = async () => {
      try {
        setCarregando(true);
        setErro(null);
        setOffset(0);
        setTemMaisAlbuns(true);

        // Buscar novos lançamentos de álbuns
        try {
          const novosLancamentosResponse = await buscarNovosLancamentos(
            paisUsuario,
            20,
            0
          );
          if (novosLancamentosResponse && novosLancamentosResponse.albums) {
            setAlbunsPopulares(novosLancamentosResponse.albums.items);

            // Obtém detalhes de cada álbum para saber o número de faixas
            const detalhesPromises = novosLancamentosResponse.albums.items.map(
              (album) => obterDetalhesAlbum(album)
            );

            const albumsDetalhados = await Promise.all(detalhesPromises);

            // Filtra álbuns com mais de 5 faixas
            const albumsFiltrados = albumsDetalhados.filter(
              (album) => album.total_tracks > 5
            );

            setAlbumsComDetalhes(albumsFiltrados);
            setOffset(20); // Prepara o próximo offset para rolagem infinita
          }
        } catch (error) {
          console.error("Erro ao buscar novos lançamentos:", error);
        }

        // Buscar singles recentes
        try {
          const singlesResponse = await buscarSinglesRecentes(20);
          if (singlesResponse && singlesResponse.albums) {
            // Filtrar apenas os itens do tipo "single"
            const apenasOsSingles = singlesResponse.albums.items.filter(
              (item) => item.album_type === "single"
            );
            setSinglesRecentes(
              apenasOsSingles.length > 0
                ? apenasOsSingles
                : singlesResponse.albums.items.slice(0, 20)
            );

            // Obtém detalhes de cada single para saber o número de faixas
            const singlesDetalhesPromises = (
              apenasOsSingles.length > 0
                ? apenasOsSingles
                : singlesResponse.albums.items.slice(0, 20)
            ).map((single) => obterDetalhesAlbum(single));

            const singlesDetalhados = await Promise.all(
              singlesDetalhesPromises
            );

            // Filtra singles com exatamente 1 faixa
            const singlesFiltrados = singlesDetalhados.filter(
              (single) => single.total_tracks === 1
            );

            setSinglesComDetalhes(singlesFiltrados);
          }
        } catch (error) {
          console.error("Erro ao buscar singles recentes:", error);
        }

        // Buscar artistas populares baseados no gênero "pop"
        try {
          const artistasResponse = await buscarArtistasPorGenero("pop", 10);
          if (artistasResponse && artistasResponse.artists) {
            // Ordenar por popularidade
            const artistasOrdenados = [...artistasResponse.artists.items].sort(
              (a, b) => b.popularity - a.popularity
            );
            setArtistasPopulares(artistasOrdenados);
          }
        } catch (error) {
          console.error("Erro ao buscar artistas populares:", error);
        }

        // Buscar faixas mais tocadas
        try {
          const tracksResponse = await buscarTopTracks(paisUsuario, 10);
          if (tracksResponse && tracksResponse.tracks) {
            setTopTracks(tracksResponse.tracks);
          }
        } catch (error) {
          console.error("Erro ao buscar top tracks:", error);
        }

        setCarregando(false);
      } catch (error) {
        console.error("Erro ao carregar dados para Descubra:", error);
        setErro(error.message);
        setCarregando(false);
      }
    };

    carregarDados();
  }, [paisUsuario]);

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

  // Exibir mensagem de erro se houver algum problema
  if (erro) {
    return (
      <div className="flex flex-col items-center justify-center p-4 min-h-[300px] text-center">
        <MdReportProblem className="text-amber-500 text-4xl mb-2" />
        <h3 className="text-gray-300 text-xl font-semibold mb-2">
          {t("feedback.errorLoading")}
        </h3>
        <p className="text-gray-400 mb-4 max-w-lg">{erro}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-verde-escuro hover:bg-verde-destaque transition-colors text-white rounded-md"
        >
          {t("feedback.reload")}
        </button>
      </div>
    );
  }

  // Determinar quais itens mostrar com base no tipo de conteúdo selecionado
  const itensMostrados = () => {
    switch (tipoConteudo) {
      case "albuns":
        return albumsComDetalhes;
      case "singles":
        return singlesComDetalhes;
      case "artistas":
        return artistasPopulares;
      default:
        return [];
    }
  };

  const getConteudoTitulo = () => {
    switch (tipoConteudo) {
      case "albuns":
        return t("app.popularAlbums");
      case "singles":
        return t("app.recentSingles");
      case "artistas":
        return t("app.popularArtists");
      default:
        return "";
    }
  };

  const getMensagemVazio = () => {
    switch (tipoConteudo) {
      case "albuns":
        return t("app.noAlbumsFound");
      case "singles":
        return t("app.noSinglesFound");
      case "artistas":
        return t("app.noArtistsFound");
      default:
        return t("app.noItemsFound");
    }
  };

  const getIconeConteudo = () => {
    switch (tipoConteudo) {
      case "albuns":
        return <MdMusicNote className="mr-2 text-primary" />;
      case "singles":
        return <FaFire className="mr-2 text-primary" />;
      case "artistas":
        return <FaUser className="mr-2 text-primary" />;
      default:
        return <MdMusicNote className="mr-2 text-primary" />;
    }
  };

  const itens = itensMostrados();

  return (
    <div className="p-4 md:p-8 mb-safe">
      {/* Cabeçalho com título e botões de filtro */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <h1 className="text-white text-2xl font-bold mb-4 sm:mb-0">
          {t("app.discover")}
        </h1>

        <div className="flex space-x-2 items-center justify-between w-full sm:w-auto">
          {/* Seletor de tipo de conteúdo */}
          <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => alternarTipoConteudo("albuns")}
              className={`px-3 py-1.5 rounded-md text-sm ${
                tipoConteudo === "albuns"
                  ? "bg-verde-destaque text-black font-medium"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <MdMusicNote className="mr-1 inline-block" />
              {t("app.albums")}
            </button>
            <button
              onClick={() => alternarTipoConteudo("singles")}
              className={`px-3 py-1.5 rounded-md text-sm ${
                tipoConteudo === "singles"
                  ? "bg-verde-destaque text-black font-medium"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <FaFire className="mr-1 inline-block" />
              {t("app.singles")}
            </button>
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

          {/* Seletor de modo de visualização */}
          <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
            <button
              onClick={alternarModoVisualizacao}
              className={`px-2 py-1.5 rounded-md text-sm ${
                modoVisualizacao === "grade"
                  ? "bg-gray-700 text-verde-destaque"
                  : "text-gray-300"
              }`}
              aria-label="Visualização em grade"
              title="Visualização em grade"
            >
              <BsGrid3X3GapFill />
            </button>
            <button
              onClick={alternarModoVisualizacao}
              className={`px-2 py-1.5 rounded-md text-sm ${
                modoVisualizacao === "lista"
                  ? "bg-gray-700 text-verde-destaque"
                  : "text-gray-300"
              }`}
              aria-label="Visualização em lista"
              title="Visualização em lista"
            >
              <BsListUl />
            </button>
          </div>
        </div>
      </div>

      {/* Loader - exibido enquanto os dados estão sendo carregados */}
      {carregando && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-verde-destaque"></div>
        </div>
      )}

      {/* Conteúdo - exibido após o carregamento */}
      {!carregando && (
        <div
          className={`transition-opacity duration-300 ${
            fade ? "opacity-100" : "opacity-0"
          }`}
        >
          <section className="mb-12">
            <h2 className="text-xl md:text-2xl font-bold mb-4 flex items-center">
              {getIconeConteudo()}
              {getConteudoTitulo()}
              {tipoConteudo === "albuns" && paisUsuario !== "BR" && (
                <span className="ml-2 text-sm text-gray-400">
                  ({paisUsuario})
                </span>
              )}
            </h2>

            {tipoConteudo === "artistas" ? (
              // Mostrar artistas
              artistasPopulares.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {artistasPopulares.map((artista) => (
                    <div
                      key={artista.id}
                      onClick={() => setItemSelecionado(artista.id)}
                      className="cursor-pointer bg-card hover:bg-card-hover p-3 rounded-lg transition-all"
                    >
                      <img
                        src={
                          artista.images && artista.images[0]
                            ? artista.images[0].url
                            : "https://via.placeholder.com/300"
                        }
                        alt={artista.name}
                        className="w-full aspect-square object-cover rounded-full mb-2"
                      />
                      <p className="font-semibold text-sm md:text-base truncate text-center">
                        {artista.name}
                      </p>
                      {artista.followers && (
                        <p className="text-xs md:text-sm text-muted text-center">
                          {new Intl.NumberFormat(
                            navigator.language || "pt-BR"
                          ).format(artista.followers.total || 0)}{" "}
                          {t("app.followers")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-card p-6 rounded-lg text-center">
                  <FaUser className="mx-auto text-3xl text-primary mb-2" />
                  <p className="text-lg font-medium">
                    {t("app.noArtistsFound")}
                  </p>
                  <p className="text-sm text-muted mt-1">
                    {t("app.tryRefreshing")}
                  </p>
                </div>
              )
            ) : // Mostrar álbuns ou singles
            itens.length > 0 ? (
              <div className="space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {itens.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setItemSelecionado(item.id)}
                      className="cursor-pointer bg-card hover:bg-card-hover p-3 rounded-lg transition-all"
                    >
                      <img
                        src={
                          item.images && item.images[0]
                            ? item.images[0].url
                            : "https://via.placeholder.com/300"
                        }
                        alt={item.name}
                        className="w-full aspect-square object-cover rounded mb-2"
                      />
                      <p className="font-semibold text-sm md:text-base truncate">
                        {item.name}
                      </p>
                      <p className="text-xs md:text-sm text-muted truncate">
                        {item.artists &&
                          item.artists.map((artist) => artist.name).join(", ")}
                      </p>
                      {item.total_tracks && (
                        <p className="text-xs text-muted mt-1">
                          {item.total_tracks}{" "}
                          {item.total_tracks === 1
                            ? t("app.track")
                            : t("app.tracks")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Elemento de referência para rolagem infinita - só mostrado para álbuns */}
                {tipoConteudo === "albuns" && temMaisAlbuns && (
                  <div
                    ref={loaderRef}
                    className="w-full py-4 flex justify-center"
                  >
                    {carregandoMais ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-verde-destaque"></div>
                    ) : (
                      <p className="text-gray-500 text-sm">
                        {t("app.scrollForMore")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-card p-6 rounded-lg text-center">
                <FaFire className="mx-auto text-3xl text-primary mb-2" />
                <p className="text-lg font-medium">{getMensagemVazio()}</p>
                <p className="text-sm text-muted mt-1">
                  {t("app.tryRefreshing")}
                </p>
              </div>
            )}
          </section>

          {/* Top Tracks - sempre visível independente do filtro */}
          <section className="mb-12">
            <h2 className="text-xl md:text-2xl font-bold mb-4 flex items-center">
              <FaFire className="mr-2 text-primary" />
              {t("app.topTracks")}
            </h2>
            {topTracks.length > 0 ? (
              <div className="bg-card rounded-lg overflow-hidden">
                {topTracks.map((track, index) => (
                  <div
                    key={track.id}
                    className="flex items-center p-3 border-b border-card-hover last:border-0 hover:bg-card-hover transition-colors"
                  >
                    <div className="flex-shrink-0 w-8 text-center text-muted font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-shrink-0 w-12 h-12 mx-2">
                      <img
                        src={
                          track.album &&
                          track.album.images &&
                          track.album.images[0]
                            ? track.album.images[0].url
                            : "https://via.placeholder.com/300"
                        }
                        alt={track.name}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="font-semibold text-sm md:text-base truncate">
                        {track.name}
                      </p>
                      <p className="text-xs md:text-sm text-muted truncate">
                        {track.artists &&
                          track.artists.map((artist) => artist.name).join(", ")}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-xs text-muted">
                      {track.duration_ms
                        ? `${Math.floor(track.duration_ms / 60000)}:${(
                            "0" + Math.floor((track.duration_ms % 60000) / 1000)
                          ).slice(-2)}`
                        : "--:--"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card p-6 rounded-lg text-center">
                <FaFire className="mx-auto text-3xl text-primary mb-2" />
                <p className="text-lg font-medium">{t("app.noTracksFound")}</p>
                <p className="text-sm text-muted mt-1">
                  {t("app.tryRefreshing")}
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default Descubra;
