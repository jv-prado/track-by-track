import { MdReportProblem } from "react-icons/md";
import React, { useEffect, useState } from "react";
import DetalhesAlbum from "./DetalhesAlbum";
import FiltroAvaliacoes from "./Filtros/FiltroAvaliacoes";
import CardAlbumAvaliado from "./Cards/CardAlbumAvaliado";
import useAvaliacoes from "../../hooks/useAvaliacoes";
import Carregamento from "../Feedback/Carregamento";
import ErroCarregamento from "../Feedback/ErroCarregamento";
import { isAuthenticated, recuperarAutenticacao } from "../../services/auth";
import { loginWithClientCredentials } from "../../services/api";
import { configurarSincronizacaoAutomatica } from "../../services/avaliacoes";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GrUpdate } from "react-icons/gr";
import { BsGrid3X3GapFill, BsListUl } from "react-icons/bs";
import { MdMusicNote } from "react-icons/md";
/**
 * Componente de barra de progresso para carregamento
 * @param {Object} props - Propriedades do componente
 * @param {number} props.progresso - Valor atual do progresso (0-100)
 * @returns {JSX.Element} Componente de barra de progresso
 */
const BarraProgresso = ({ progresso }) => {
  // Se o progresso for 0, não exibir a barra
  if (progresso <= 0) return null;

  return (
    <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden mb-4">
      <div
        className="bg-verde-destaque h-full transition-all duration-300 ease-out"
        style={{ width: `${progresso}%` }}
      ></div>
    </div>
  );
};

/**
 * Componente que envolve outro para capturar erros
 */
class TratadorErros extends React.Component {
  constructor(props) {
    super(props);
    this.state = { temErro: false, mensagemErro: "" };
  }

  static getDerivedStateFromError(erro) {
    return {
      temErro: true,
      mensagemErro: erro.message || "Ocorreu um erro inesperado",
    };
  }

  componentDidCatch(erro, infoErro) {
    // Tratamento silencioso de erro
  }

  render() {
    if (this.state.temErro) {
      return (
        <div className="p-8 text-center">
          <div className="text-red-500 mb-4">
            <MdReportProblem size={48} className="mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-red-400 mb-4">
            {this.props.translations.errorTitle}
          </h2>
          <p className="text-gray-400 mb-6">
            {this.props.translations.errorMessage}
          </p>
          <p className="text-gray-500 text-sm mt-3 mb-6">
            {this.props.translations.errorDetails}: {this.state.mensagemErro}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-verde-destaque hover:bg-verde-destaque/80 text-white font-bold py-2 px-6 rounded-full focus:outline-none focus:shadow-outline transition-all cursor-pointer"
          >
            {this.props.translations.reloadPage}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Componente para exibir álbuns avaliados pelo usuário
 * @returns {JSX.Element} Componente de álbuns avaliados
 */
const MinhasAvaliacoes = () => {
  const { t } = useTranslation();
  const [autenticado, setAutenticado] = useState(isAuthenticated());
  const [carregandoAuth, setCarregandoAuth] = useState(false);
  const [tentouRecuperar, setTentouRecuperar] = useState(false);
  const [carregandoTela, setCarregandoTela] = useState(true);
  const [estavaNaTelaDetalhes, setEstavaNaTelaDetalhes] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [modoVisualizacao, setModoVisualizacao] = useState(() => {
    const preferenciaUsuario = localStorage.getItem(
      "preferenciaModoVisualizacao"
    );
    return preferenciaUsuario || "grade"; // 'grade' ou 'lista'
  });
  const [fade, setFade] = useState(true);
  const navigate = useNavigate();

  const {
    albunsExibidos,
    carregando,
    albumSelecionado,
    setAlbumSelecionado,
    filtroNota,
    setFiltroNota,
    termoPesquisa,
    setTermoPesquisa,
    ordenacao,
    alternarOrdenacao,
    erro,
    tentarNovamente,
    albunsAvaliados,
    progressoCarregamento,
    carregamentoProgressivo,
    setCarregamentoProgressivo,
    recarregarListaAlbuns,
    setProgressoCarregamento,
  } = useAvaliacoes();

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

  const getGridCols = () => {
    if (windowWidth < 550) return 2; // 2 albuns por linha em telas menores que 550px
    if (windowWidth < 1100) return 2; // 2 albuns por linha em telas menores que 1100px
    if (windowWidth < 1500) return 3; // 3 albuns por linha em telas médias
    return 5; // 5 albuns por linha em telas grandes
  };

  const gridCols = getGridCols();

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

  // Recarregar a lista quando o usuário voltar da tela de detalhes de álbum
  useEffect(() => {
    if (albumSelecionado) {
      // O usuário está indo para a tela de detalhes
      setEstavaNaTelaDetalhes(true);
    } else if (estavaNaTelaDetalhes) {
      // O usuário estava na tela de detalhes e agora voltou
      recarregarListaAlbuns();
      setEstavaNaTelaDetalhes(false);
    }
  }, [albumSelecionado]);

  // Garantir que os filtros e ordenação sejam aplicados quando o componente montar
  useEffect(() => {
    // Forçar reordenação dos álbuns exibidos quando o componente montar
    if (albunsAvaliados && albunsAvaliados.length > 0) {
      recarregarListaAlbuns();
    }
  }, []);

  // Tentar recuperar autenticação automaticamente ao montar o componente
  useEffect(() => {
    const tentarRecuperarAutenticacao = async () => {
      try {
        // Verificar se existe um usuário de demonstração
        const demoToken = localStorage.getItem("demo_token");
        const demoExpiry = localStorage.getItem("demo_token_expiry");
        const demoAtivo =
          demoToken && demoExpiry && parseInt(demoExpiry) > Date.now();

        if (demoAtivo) {
          setAutenticado(true);
          setCarregandoTela(false);
          return;
        }

        if (!isAuthenticated() && !tentouRecuperar) {
          setCarregandoAuth(true);
          setTentouRecuperar(true);

          const recuperado = await recuperarAutenticacao();

          if (recuperado) {
            setAutenticado(true);
            tentarNovamente();
          }
        }
      } catch (erro) {
        // Erro silencioso
      } finally {
        setCarregandoAuth(false);
        setCarregandoTela(false);
      }
    };

    tentarRecuperarAutenticacao();
  }, [tentouRecuperar]);

  // Verificar autenticação quando o componente é montado
  useEffect(() => {
    const verificarAuth = () => {
      try {
        // Verificar se existe um usuário de demonstração
        const demoToken = localStorage.getItem("demo_token");
        const demoExpiry = localStorage.getItem("demo_token_expiry");
        const demoAtivo =
          demoToken && demoExpiry && parseInt(demoExpiry) > Date.now();

        // Verificar autenticação normal ou modo de demonstração
        const estadoAuth = isAuthenticated() || demoAtivo;
        setAutenticado(estadoAuth);
        setCarregandoTela(false);
      } catch (erro) {
        // Erro silencioso
        setCarregandoTela(false);
      }
    };

    verificarAuth();

    // Verificar periodicamente o estado de autenticação para atualizar a UI
    const intervalo = setInterval(verificarAuth, 2000);

    return () => clearInterval(intervalo);
  }, []);

  const fazerLoginDemo = async () => {
    setCarregandoAuth(true);
    try {
      // Criar um "usuário demo" no localStorage
      const usuarioDemo = {
        id: "usuario-demo-" + Date.now(),
        nome: "Usuário Demo",
        email: "demo@example.com",
        tipo: "demo",
      };

      // Salvar token demo com validade de 7 dias
      const dataExpiracao = Date.now() + 7 * 24 * 60 * 60 * 1000;
      localStorage.setItem("demo_usuario", JSON.stringify(usuarioDemo));
      localStorage.setItem("demo_token", "demo_" + Date.now());
      localStorage.setItem("demo_token_expiry", dataExpiracao.toString());

      // Inicializar estruturas de dados para avaliações se não existirem
      localStorage.setItem("avaliacoesFaixas", JSON.stringify({}));
      localStorage.setItem("mapaFaixasAlbuns", JSON.stringify({}));
      localStorage.setItem("datasAvaliacoes", JSON.stringify({}));
      localStorage.setItem("preferenciasAlbuns", JSON.stringify({}));

      // Sinalizar que o modo de demonstração está ativo
      localStorage.setItem("modo_demo_ativo", "true");

      // Configurar sincronização automática entre localStorage e memória
      configurarSincronizacaoAutomatica();

      // Forçar uma recarga completa da página para garantir que o
      // usuário demo seja reconhecido por todos os componentes
      window.location.href = window.location.href;
    } catch (erro) {
      // Erro silencioso
    } finally {
      setCarregandoAuth(false);
    }
  };

  const atualizarListaAlbuns = async () => {
    // Indicar que estamos atualizando os dados
    setCarregamentoProgressivo(true);

    // Verificar se setProgressoCarregamento existe antes de chamá-lo
    if (typeof setProgressoCarregamento === "function") {
      setProgressoCarregamento(5); // Iniciar com um progresso pequeno para feedback visual
    }

    console.log("Iniciando atualização da lista de álbuns");

    try {
      // Simular progresso durante o carregamento
      const intervaloProgresso = setInterval(() => {
        setProgressoCarregamento((prev) => {
          // Aumentar gradualmente até 90% (os 10% finais serão quando concluir)
          if (prev < 90) {
            return prev + Math.floor(Math.random() * 10) + 5;
          }
          return prev;
        });
      }, 900);

      // Aguardar a conclusão da recarga
      await recarregarListaAlbuns();

      // Limpar o intervalo e definir 100% quando concluído
      clearInterval(intervaloProgresso);
      setProgressoCarregamento(100);

      // Após um breve momento, esconder a barra de progresso
      setTimeout(() => {
        setProgressoCarregamento(0);
        setCarregamentoProgressivo(false);
      }, 200);

      console.log("Lista de álbuns atualizada com sucesso");
    } catch (erro) {
      console.error("Erro ao atualizar lista de álbuns:", erro);
      // Em caso de erro, também limpar o progresso
      setProgressoCarregamento(0);
      setCarregamentoProgressivo(false);
    }
  };

  // Exibir indicador de carregamento enquanto verificamos a autenticação
  if (carregandoTela) {
    return <Carregamento />;
  }

  // Se não estiver autenticado, mostrar mensagem e botão para fazer login no modo demo
  if (!autenticado) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-verde-destaque mb-4">
          {t("myRatings.sessionExpired")}
        </h2>
        <p className="text-gray-400 mb-6">{t("myRatings.loginAgain")}</p>
        <button
          onClick={fazerLoginDemo}
          className="bg-verde-destaque hover:bg-verde-destaque/80 text-white font-bold py-2 px-6 rounded-full focus:outline-none focus:shadow-outline transition-all cursor-pointer"
          disabled={carregandoAuth}
        >
          {carregandoAuth
            ? t("myRatings.loading")
            : t("myRatings.enterDemoMode")}
        </button>
      </div>
    );
  }

  // Exibir o indicador de carregamento
  if (carregando && !carregamentoProgressivo) {
    return <Carregamento />;
  }

  // Exibir mensagem de erro se houver
  if (erro) {
    return (
      <ErroCarregamento mensagem={erro} onTentarNovamente={tentarNovamente} />
    );
  }

  // Exibir detalhes do álbum selecionado
  if (albumSelecionado) {
    return (
      <DetalhesAlbum
        albumId={albumSelecionado}
        onVoltar={() => setAlbumSelecionado(null)}
      />
    );
  }

  // Exibir mensagem se não houver álbuns avaliados
  if (!albunsAvaliados || albunsAvaliados.length === 0) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-3xl font-bold text-verde-destaque mb-4">
          {t("myRatings.title")}
        </h2>
        <p className="text-gray-400">{t("myRatings.noAlbumsRated")}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-verde-destaque">
          {t("myRatings.ratedAlbums")}
        </h2>

        <div className="flex items-center gap-2">
          {/* Botão atualizar */}
          <button
            onClick={atualizarListaAlbuns}
            className="ml-2 flex items-center justify-center px-3 py-1.5 h-10 rounded-md text-sm bg-gray-800 text-white hover:bg-gray-700 transition-colors gap-2 group focus:text-verde-destaque active:text-verde-destaque"
            aria-label={t("myRatings.update")}
            title={t("myRatings.update")}
          >
            <GrUpdate className="text-white group-focus:text-verde-destaque group-active:text-verde-destaque transition-colors" />
            <span className="text-white group-focus:text-verde-destaque group-active:text-verde-destaque transition-colors">
              {t("myRatings.update")}
            </span>
          </button>
          {/* Alternância de visualização: mobile = 1 botão, desktop = 2 botões on/off */}
          <>
            {/* Mobile: botão único */}
            <div className="flex md:hidden">
              <button
                onClick={alternarModoVisualizacao}
                className="ml-2 flex items-center justify-center px-2 py-1.5 h-10 rounded-md text-sm bg-gray-800 text-verde-destaque hover:bg-gray-700 transition-colors"
                aria-label={
                  modoVisualizacao === "grade"
                    ? t("myRatings.viewAsList")
                    : t("myRatings.viewAsGrid")
                }
                title={
                  modoVisualizacao === "grade"
                    ? t("myRatings.viewAsList")
                    : t("myRatings.viewAsGrid")
                }
              >
                {modoVisualizacao === "grade" ? (
                  <BsListUl className="text-verde-destaque" />
                ) : (
                  <BsGrid3X3GapFill className="text-verde-destaque" />
                )}
              </button>
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
                aria-label={t("myRatings.viewAsGrid")}
                title={t("myRatings.viewAsGrid")}
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
                aria-label={t("myRatings.viewAsList")}
                title={t("myRatings.viewAsList")}
              >
                <BsListUl />
              </button>
            </div>
          </>
        </div>
      </div>

      {/* Barra de progresso */}
      {progressoCarregamento > 0 && (
        <div className="mb-4">
          <BarraProgresso progresso={progressoCarregamento} />
          <p className="text-xs text-gray-400 text-right">
            {t("myRatings.loadingAlbums", { progress: progressoCarregamento })}
          </p>
        </div>
      )}

      {/* Componente de filtros e ordenação */}
      <FiltroAvaliacoes
        termoPesquisa={termoPesquisa}
        setTermoPesquisa={setTermoPesquisa}
        filtroNota={filtroNota}
        setFiltroNota={setFiltroNota}
        ordenacao={ordenacao}
        alternarOrdenacao={alternarOrdenacao}
      />

      {/* Exibir mensagem se nenhum álbum corresponder aos filtros */}
      {!albunsExibidos || albunsExibidos.length === 0 ? (
        <p className="text-center text-gray-400 py-8 text-sm md:text-base">
          {t("myRatings.noMatchingAlbums")}
        </p>
      ) : (
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
              {albunsExibidos.map((album) => (
                <CardAlbumAvaliado
                  key={album.id}
                  album={album}
                  setAlbumSelecionado={setAlbumSelecionado}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:gap-4">
              {albunsExibidos.map((album) => (
                <div
                  key={album.id}
                  className="bg-cinza-escuro rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex flex-col h-full cursor-pointer relative hover:bg-cinza-escuro/90 group"
                  onClick={() => setAlbumSelecionado(album.id)}
                  title={t("feed.cliqueVerDetalhes")}
                >
                  <div className="flex h-full py-3 px-2 md:py-3 md:px-4 lg:py-4">
                    {/* LADO ESQUERDO: Imagem do álbum */}
                    <div className="flex-shrink-0 w-16 h-16 md:w-18 md:h-18 lg:w-20 lg:h-20 bg-cinza-escuro rounded-lg overflow-hidden mx-2">
                      {album.images && album.images.length > 0 ? (
                        <img
                          src={album.images[0].url}
                          alt={t("albumCard.coverAlt", {
                            albumName: album.name,
                          })}
                          className="w-full h-full object-cover rounded-lg"
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
                              '<div class="text-verde-destaque text-4xl"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0z"></path><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"></path></svg></div>';
                            e.target.parentElement.appendChild(fallbackIcon);
                          }}
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-cinza-escuro rounded-lg">
                          <MdMusicNote className="text-verde-destaque text-3xl" />
                        </div>
                      )}
                    </div>

                    {/* MEIO: Nome, artista e botões */}
                    <div className="flex-grow min-w-0 mx-2 flex flex-col justify-center">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3
                            className="font-bold text-sm md:text-base lg:text-lg text-white truncate overflow-hidden whitespace-nowrap pr-1"
                            style={{
                              maxWidth:
                                window.innerWidth < 430
                                  ? "150px"
                                  : window.innerWidth < 1000
                                  ? "180px"
                                  : window.innerWidth < 1300
                                  ? "260px"
                                  : window.innerWidth < 1500
                                  ? "320px"
                                  : "600px",
                            }}
                            title={album.name}
                          >
                            {album.name}
                          </h3>
                          <p className="text-verde-destaque text-xs md:text-sm line-clamp-1 font-medium truncate pr-1">
                            {album.artists &&
                            album.artists.map((a) => a.name).join(", ").length >
                              28
                              ? album.artists
                                  .map((a) => a.name)
                                  .join(", ")
                                  .substring(0, 25) + "..."
                              : album.artists?.map((a) => a.name).join(", ") ||
                                t("albumCard.unknownArtist")}
                          </p>
                        </div>

                        {/* Nota compacta */}
                        <div
                          className={`${(() => {
                            if (
                              album.progressoAvaliacao &&
                              album.progressoAvaliacao.percentual < 100
                            ) {
                              return "bg-gray-400";
                            }
                            const nota = parseFloat(album.mediaAvaliacao || 0);
                            if (nota < 4) return "bg-red-500";
                            if (nota < 7) return "bg-yellow-500";
                            return "bg-verde-destaque";
                          })()} text-cinza-escuro rounded-lg px-3 py-1 md:px-4 md:py-2 text-lg md:text-2xl lg:text-3xl font-bold flex items-center shadow-sm`}
                        >
                          {album.mediaAvaliacao
                            ? Number.isInteger(album.mediaAvaliacao)
                              ? album.mediaAvaliacao.toString()
                              : album.mediaAvaliacao.toFixed(1)
                            : "0"}
                        </div>
                      </div>

                      {/* Progresso e botão do Spotify em linha */}
                      <div className="flex items-center mt-2 md:mt-3 gap-2 justify-between">
                        {/* Progresso compacto */}
                        {album.progressoAvaliacao && (
                          <div className="flex-grow max-w-xl">
                            <div className="w-full h-1.5 md:h-1.5 bg-cinza rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ease-in-out ${
                                  album.progressoAvaliacao.percentual >= 100
                                    ? "bg-verde-destaque"
                                    : "bg-blue-500/50"
                                }`}
                                style={{
                                  width: `${Math.floor(
                                    album.progressoAvaliacao.percentual
                                  )}%`,
                                }}
                              ></div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-400 mt-0.5 md:mt-1">
                              <span>
                                {Math.floor(
                                  album.progressoAvaliacao.percentual
                                )}
                                %
                              </span>
                              <span>
                                {album.progressoAvaliacao.avaliadas}/
                                {album.progressoAvaliacao.total}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Apenas o botão do Spotify */}
                        <a
                          href={`https://open.spotify.com/album/${album.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-2 py-1 md:px-3 md:py-1.5 bg-black/30 rounded text-xs md:text-xs text-gray-300 hover:text-green-400 hover:bg-black/50 transition-colors z-20 relative flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-green-400 mr-1">
                            <svg
                              stroke="currentColor"
                              fill="currentColor"
                              stroke-width="0"
                              viewBox="0 0 448 512"
                              height="1em"
                              width="1em"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path d="M224 0C100.3 0 0 100.3 0 224c0 123.76 100.3 224 224 224 123.76 0 224-100.24 224-224C448 100.3 347.76 0 224 0zm93.77 328.46c-3.94 5.2-11.1 6.37-16.4 2.14-45.12-27.48-101.7-33.73-168.45-18.44-6.52 1.34-13.4-2.78-14.95-9.47-1.5-6.62 2.83-13.4 9.44-14.94 73.25-16.72 136.2-9.59 187.13 21.5 5.26 3.2 6.38 10.5 3.23 15.38zm25.08-56.3c-5 6.9-14.25 8.34-21.1 3.5-51.65-31.62-130.34-40.9-191.46-22.33-7.83 2.3-16.08-2.1-18.5-9.92-2.27-7.8 2.1-16.1 9.92-18.36 69.68-21.14 156.2-10.8 216.27 25.9 6.9 4.9 8.34 14.3 3.5 21.2zm2.2-55.8c-62.62-37.1-166.04-40.9-225.92-22.73-9.4 2.9-19.3-2.4-22.2-11.8-2.85-9.4 2.43-19.8 11.8-22.2 68.5-20.9 182.6-16.8 253.8 25.7 8.5 5.05 11.46 16.0 6.45 24.6-5.03 8.63-15.97 11.6-24.57 6.6z"></path>
                            </svg>
                          </span>
                          <span className="whitespace-nowrap">
                            {t("feed.ouvirSpotify")}
                          </span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Componente MinhasAvaliacoes envolvido pelo TratadorErros
const MinhasAvaliacoesComTratamentoErro = () => {
  const { t } = useTranslation();

  const errorTranslations = {
    errorTitle: t("myRatings.error.title"),
    errorMessage: t("myRatings.error.message"),
    errorDetails: t("myRatings.error.details"),
    reloadPage: t("myRatings.error.reload"),
  };

  return (
    <TratadorErros translations={errorTranslations}>
      <MinhasAvaliacoes />
    </TratadorErros>
  );
};

export default MinhasAvaliacoesComTratamentoErro;
