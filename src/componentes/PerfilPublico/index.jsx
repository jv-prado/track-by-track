import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MdMusicNote, MdArrowBack } from "react-icons/md";
import { FaSpotify } from "react-icons/fa";
import { FaRegStar } from "react-icons/fa";
import { MdRateReview } from "react-icons/md";
import { BsGrid3X3GapFill, BsListUl } from "react-icons/bs";
import { obterAvaliacoesGlobais } from "../../services/firebase/index";
import Carregamento from "../Feedback/Carregamento";
import ErroCarregamento from "../Feedback/ErroCarregamento";
import { formatarData } from "../../services/avaliacoes";
import ModalAvaliacoesUsuario from "../Feed/ModalAvaliacoesUsuario";

/**
 * Componente que exibe o perfil público de um usuário e suas avaliações
 * @returns {JSX.Element} Componente de perfil público
 */
const PerfilPublico = () => {
  const { t } = useTranslation();
  const { usuarioId } = useParams();
  const navigate = useNavigate();
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [dadosUsuario, setDadosUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [avaliacaoSelecionada, setAvaliacaoSelecionada] = useState(null);
  const [modalReviewAberto, setModalReviewAberto] = useState(false);
  const [reviewSelecionada, setReviewSelecionada] = useState("");
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [modoVisualizacao, setModoVisualizacao] = useState(() => {
    const preferenciaUsuario = localStorage.getItem(
      "preferenciaModoVisualizacao"
    );
    return preferenciaUsuario || "grade"; // 'grade' ou 'lista'
  });
  const [fade, setFade] = useState(true);

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

  // Determinar o número de colunas com base na largura da tela
  const getGridCols = () => {
    if (windowWidth < 550) return 2; // 2 itens por linha em telas menores que 550px
    if (windowWidth < 1100) return 2; // 2 itens por linha em telas menores que 1100px
    if (windowWidth < 1500) return 3; // 3 itens por linha em telas médias
    return 4; // 4 itens por linha em telas grandes
  };

  const gridCols = getGridCols();

  // Buscar as avaliações do usuário especificado
  useEffect(() => {
    const carregarAvaliacoes = async () => {
      setCarregando(true);
      setErro(null);

      try {
        // Buscar todas as avaliações e filtrar pelo usuário específico
        const todasAvaliacoes = await obterAvaliacoesGlobais(100);
        const avaliacoesDoUsuario = todasAvaliacoes.filter(
          (avaliacao) => avaliacao.usuario.id === usuarioId
        );

        // Verificar se encontrou avaliações para o usuário
        if (avaliacoesDoUsuario.length === 0) {
          setErro(
            t(
              "perfilUsuario.nenhumaAvaliacao",
              "Este usuário ainda não possui avaliações"
            )
          );
          setCarregando(false);
          return;
        }

        // Obter informações do usuário da primeira avaliação
        const usuario = avaliacoesDoUsuario[0].usuario;
        setDadosUsuario(usuario);

        // Processar avaliações
        const avaliacoesProcessadas = avaliacoesDoUsuario
          .map((avaliacao) => ({
            ...avaliacao,
            imagem: validarUrlImagem(avaliacao.imagem),
            usuario: {
              ...avaliacao.usuario,
              foto: validarUrlImagem(avaliacao.usuario.foto),
            },
            atualizada:
              avaliacao.atualizada ||
              avaliacao.atualizacao ||
              (avaliacao.dataAtualizacao ? true : false) ||
              (avaliacao.atualizacaoTimestamp ? true : false),
            temReview:
              typeof avaliacao.review === "string" ||
              (avaliacao.preferencias &&
                typeof avaliacao.preferencias.review === "string"),
          }))
          .filter((avaliacao) => (avaliacao.progresso?.percentual || 0) >= 100);

        setAvaliacoes(avaliacoesProcessadas);
      } catch (error) {
        console.error("Erro ao carregar avaliações do usuário:", error);
        setErro(error.message || "Erro ao carregar as avaliações do usuário");
      } finally {
        setCarregando(false);
      }
    };

    if (usuarioId) {
      carregarAvaliacoes();
    } else {
      setErro("ID de usuário não especificado");
      setCarregando(false);
    }
  }, [usuarioId, t]);

  // Função para validar URLs de imagem
  const validarUrlImagem = (url) => {
    if (!url) return null;
    try {
      new URL(url);
      return url;
    } catch {
      return null;
    }
  };

  // Função para determinar a cor da nota baseada no valor
  const obterCorNota = (nota) => {
    // Converter para número para garantir a comparação correta
    const notaNum = parseFloat(nota);

    if (notaNum < 4) return "bg-red-500"; // Nota baixa: vermelho
    if (notaNum < 7) return "bg-yellow-500"; // Nota média: amarelo
    return "bg-verde-destaque"; // Nota alta: verde
  };

  // Formatação da média para exibição
  const formatarMedia = (media) => {
    // Garantir que é um número válido
    if (isNaN(media) || media === null || media === undefined) {
      return "0";
    }

    // Limitar a valores entre 0 e 10
    const mediaLimitada = Math.max(0, Math.min(10, media));

    // Exibir números inteiros sem casa decimal
    return Number.isInteger(mediaLimitada)
      ? mediaLimitada.toString()
      : mediaLimitada.toFixed(1);
  };

  // Função para formatar data com segurança
  const formatarDataSegura = (data) => {
    if (!data) return "Data não disponível";

    try {
      // Para dados demo que já contêm um objeto Date
      if (data instanceof Date) {
        return formatarData(data);
      }

      // Para dados do Firebase que contêm timestamp com segundos
      if (data.segundos) {
        return formatarData(new Date(data.segundos * 1000));
      }

      // Fallback para qualquer outro formato
      return "Data não disponível";
    } catch (erro) {
      console.warn("Erro ao formatar data:", erro);
      return "Data não disponível";
    }
  };

  // Função para navegar para a página de detalhes do álbum
  const navegarParaAlbum = (albumId, event) => {
    // Verificar se o clique veio de um elemento clicável (como um botão ou link)
    if (
      event.target.tagName === "A" ||
      event.target.tagName === "BUTTON" ||
      event.target.closest("a") ||
      event.target.closest("button")
    ) {
      return; // Não fazer nada se o clique foi em um elemento clicável
    }

    // Navegar para a página de detalhes do álbum usando a rota dedicada
    navigate(`/album/${albumId}`);
  };

  // Função para abrir o modal de avaliações
  const abrirModalAvaliacoes = (avaliacao, e) => {
    e.stopPropagation(); // Evitar propagação do clique
    setAvaliacaoSelecionada({
      albumId: avaliacao.id,
      usuarioId: avaliacao.usuario.id,
    });
    setModalAberto(true);
  };

  // Função para fechar o modal
  const fecharModal = () => {
    setModalAberto(false);
    setAvaliacaoSelecionada(null);
  };

  // Função para abrir modal com a resenha
  const abrirModalReview = (avaliacao, e) => {
    e.stopPropagation();
    setReviewSelecionada(
      avaliacao.review || avaliacao.preferencias?.review || ""
    );
    setAvaliacaoSelecionada({
      albumId: avaliacao.id,
      usuarioId: avaliacao.usuario.id,
    });
    setModalReviewAberto(true);
  };

  // Função para fechar o modal de resenha
  const fecharModalReview = () => {
    setModalReviewAberto(false);
    setReviewSelecionada("");
  };

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

  if (carregando) {
    return (
      <Carregamento
        mensagem={t(
          "perfilUsuario.carregando",
          "Carregando perfil do usuário..."
        )}
      />
    );
  }

  if (erro) {
    return (
      <div className="p-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-verde-destaque mb-4 hover:underline"
        >
          <MdArrowBack className="mr-1" /> {t("perfilUsuario.voltar", "Voltar")}
        </button>
        <ErroCarregamento
          mensagem={erro}
          titulo={t(
            "perfilUsuario.erroCarregamento",
            "Erro ao carregar perfil"
          )}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Botão voltar e título */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-verde-destaque hover:underline"
        >
          <MdArrowBack className="mr-1" /> {t("perfilUsuario.voltar", "Voltar")}
        </button>

        {/* Botões de alternar visualização */}
        <div className="flex items-center gap-2">
          {avaliacoes && avaliacoes.length > 0 && (
            <>
              {/* Mobile: botão único */}
              <div className="flex md:hidden">
                <button
                  onClick={alternarModoVisualizacao}
                  className="ml-2 flex items-center justify-center px-2 py-1.5 h-10 rounded-md text-sm bg-gray-800 text-verde-destaque hover:bg-gray-700 transition-colors"
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
            </>
          )}
        </div>
      </div>

      {/* Cabeçalho do perfil */}
      <div className="bg-cinza-escuro rounded-xl p-4 mb-6 flex items-center">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center shadow-sm mr-4">
          {dadosUsuario?.foto ? (
            <img
              src={dadosUsuario.foto}
              alt={t("perfilUsuario.fotoUsuario", { nome: dadosUsuario.nome })}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-verde-destaque/20 text-verde-destaque text-3xl font-bold">
              {dadosUsuario?.nome.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">
            {dadosUsuario?.nome}'s ratings
          </h1>
          <p className="text-gray-400 text-sm">
            {t("perfilUsuario.avaliacoes", "{{count}} avaliações", {
              count: avaliacoes.length,
            })}
          </p>
        </div>
      </div>

      {/* Lista de avaliações */}
      <div>
        <h2 className="text-lg md:text-xl font-bold text-verde-destaque mb-4">
          {t("perfilUsuario.albumsAvaliados", "Álbuns avaliados")}
        </h2>

        {avaliacoes.length === 0 ? (
          <div className="text-center py-12 bg-cinza-escuro rounded-xl">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto text-gray-500 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
            <p className="text-gray-300 text-lg font-medium">
              {t(
                "perfilUsuario.nenhumaAvaliacao",
                "Este usuário ainda não possui avaliações"
              )}
            </p>
          </div>
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
                {avaliacoes.map((avaliacao, index) => (
                  <div
                    key={`${avaliacao.id}-${index}`}
                    className="bg-cinza-escuro rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex flex-col h-full cursor-pointer relative hover:bg-cinza-escuro/90 group p-3"
                    onClick={(e) => navegarParaAlbum(avaliacao.id, e)}
                    title={t("feed.cliqueVerDetalhes")}
                  >
                    {/* Imagem do álbum */}
                    <div className="w-full aspect-square bg-cinza-escuro rounded-lg overflow-hidden mb-3 relative">
                      {avaliacao.imagem ? (
                        <img
                          src={avaliacao.imagem}
                          alt={t("feed.capaAlbum", { nome: avaliacao.nome })}
                          className="w-full h-full object-cover rounded-lg"
                          onError={handleImageError}
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-cinza-escuro rounded-lg">
                          <MdMusicNote className="text-verde-destaque text-4xl" />
                        </div>
                      )}
                    </div>

                    {/* Nome, artista, nota */}
                    <div className="flex flex-row items-center justify-between gap-2 w-full">
                      <div className="flex flex-col min-w-0 flex-1">
                        <h3
                          className="font-bold text-sm md:text-base line-clamp-1 text-white truncate pr-1"
                          title={avaliacao.nome}
                        >
                          {avaliacao.nome}
                        </h3>
                        <p
                          className="text-verde-destaque text-xs md:text-sm line-clamp-1 font-medium truncate pr-1 mb-0"
                          title={avaliacao.artista}
                        >
                          {avaliacao.artista}
                        </p>
                        {/* Data da avaliação */}
                        <span className="text-xs opacity-70 truncate max-w-[120px] mt-1 block">
                          {formatarDataSegura(
                            avaliacao.data || avaliacao.dataAvaliacao
                          )}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex flex-col justify-between items-end min-w-[80px] h-full">
                          <div
                            className={`${obterCorNota(
                              avaliacao.media || avaliacao.mediaAvaliacao
                            )} text-cinza-escuro rounded-lg px-2 py-1 font-bold text-lg flex items-center justify-center shadow-sm my-auto w-16`}
                          >
                            <span className="text-cinza-escuro">
                              {formatarMedia(
                                avaliacao.media || avaliacao.mediaAvaliacao
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Botões de ação */}
                    <div className="flex flex-row items-center justify-center gap-2 mt-3">
                      {avaliacao.temReview && (
                        <button
                          className="inline-flex items-center justify-center bg-indigo-700 hover:bg-indigo-600 text-white rounded-md text-xs px-2 py-1 transition-colors shadow-sm z-20 cursor-pointer"
                          onClick={(e) => abrirModalReview(avaliacao, e)}
                          title={t("feed.verResenha", "Ver resenha")}
                        >
                          <MdRateReview className="text-base" />
                        </button>
                      )}
                      <button
                        style={{
                          backgroundColor: "#5d1f89",
                          color: "#fff",
                        }}
                        onMouseOver={(e) =>
                          (e.currentTarget.style.backgroundColor = "#7C3AED")
                        }
                        onMouseOut={(e) =>
                          (e.currentTarget.style.backgroundColor = "#5d1f89")
                        }
                        className="inline-flex items-center justify-center rounded-md text-xs px-2 py-1 transition-colors shadow-sm z-20 cursor-pointer"
                        onClick={(e) => abrirModalAvaliacoes(avaliacao, e)}
                        title={t("feed.faixaPorFaixa", "Faixa por faixa")}
                      >
                        <FaRegStar className="text-base text-white" />
                      </button>
                      <a
                        href={`https://open.spotify.com/album/${avaliacao.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center bg-green-600 hover:bg-green-500 text-white rounded-md text-xs px-2 py-1 transition-colors shadow-sm z-20"
                        onClick={(e) => e.stopPropagation()}
                        title="Ouvir no Spotify"
                      >
                        <FaSpotify className="text-base text-white" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {avaliacoes.map((avaliacao, index) => (
                  <div
                    key={`${avaliacao.id}-${index}`}
                    className="bg-cinza-escuro rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:scale-[1.01] hover:shadow-xl flex flex-col h-full cursor-pointer relative hover:bg-cinza-escuro/90 group p-4"
                    onClick={(e) => navegarParaAlbum(avaliacao.id, e)}
                    title={t("feed.cliqueVerDetalhes")}
                  >
                    <div className="flex gap-3 items-center">
                      {/* Imagem do álbum */}
                      <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 bg-cinza-escuro rounded-lg overflow-hidden">
                        {avaliacao.imagem ? (
                          <img
                            src={avaliacao.imagem}
                            alt={t("feed.capaAlbum", { nome: avaliacao.nome })}
                            className="w-full h-full object-cover rounded-lg"
                            onError={handleImageError}
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-cinza-escuro rounded-lg">
                            <MdMusicNote className="text-verde-destaque text-4xl" />
                          </div>
                        )}
                      </div>

                      {/* Nome, artista e data */}
                      <div className="flex-grow min-w-0">
                        <h3 className="font-bold text-sm md:text-base line-clamp-1 text-white truncate pr-1">
                          {avaliacao.nome}
                        </h3>
                        <p className="text-verde-destaque text-xs md:text-sm line-clamp-1 font-medium truncate pr-1 mb-2">
                          {avaliacao.artista}
                        </p>
                        <span className="text-xs text-gray-400">
                          {formatarDataSegura(
                            avaliacao.data || avaliacao.dataAvaliacao
                          )}
                        </span>

                        {/* Botões de ação */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {avaliacao.temReview && (
                            <button
                              className="inline-flex items-center bg-indigo-700 hover:bg-indigo-600 text-white rounded-md text-xs px-2 py-1 transition-colors shadow-sm z-20 cursor-pointer"
                              onClick={(e) => abrirModalReview(avaliacao, e)}
                              title={t("feed.verResenha", "Ver resenha")}
                            >
                              <MdRateReview className="mr-1 text-base" />
                              <span className="whitespace-nowrap">
                                {t("feed.verResenha", "Ver resenha")}
                              </span>
                            </button>
                          )}
                          <button
                            style={{
                              backgroundColor: "#5d1f89",
                              color: "#fff",
                            }}
                            onMouseOver={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                "#7C3AED")
                            }
                            onMouseOut={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                "#5d1f89")
                            }
                            className="inline-flex items-center rounded-md text-xs px-2 py-1 transition-colors shadow-sm z-20 cursor-pointer"
                            onClick={(e) => abrirModalAvaliacoes(avaliacao, e)}
                            title={t("feed.faixaPorFaixa", "Faixa por faixa")}
                          >
                            <FaRegStar className="mr-1 text-base text-white" />
                            <span className="whitespace-nowrap">
                              {t("feed.faixaPorFaixa", "Faixa por faixa")}
                            </span>
                          </button>
                          <a
                            href={`https://open.spotify.com/album/${avaliacao.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center bg-green-600 hover:bg-green-500 text-white rounded-md text-xs px-2 py-1 transition-colors shadow-sm z-20"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FaSpotify className="mr-1 text-base text-white" />
                            <span className="whitespace-nowrap">
                              {t("feed.ouvirSpotify", "Ouvir no Spotify")}
                            </span>
                          </a>
                        </div>
                      </div>

                      {/* Nota média */}
                      <div className="flex flex-col items-end min-w-[80px]">
                        <div
                          className={`${obterCorNota(
                            avaliacao.media || avaliacao.mediaAvaliacao
                          )} text-cinza-escuro rounded-lg px-2 py-1 font-bold text-lg flex items-center justify-center shadow-sm my-auto w-16`}
                        >
                          <span className="text-cinza-escuro">
                            {formatarMedia(
                              avaliacao.media || avaliacao.mediaAvaliacao
                            )}
                          </span>
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

      {/* Modal de avaliações do usuário */}
      {modalAberto && avaliacaoSelecionada && (
        <ModalAvaliacoesUsuario
          usuarioId={avaliacaoSelecionada.usuarioId}
          albumId={avaliacaoSelecionada.albumId}
          onClose={fecharModal}
        />
      )}

      {/* Modal de resenha */}
      {modalReviewAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] px-2 md:px-4">
          <div className="bg-cinza-escuro rounded-xl p-5 max-w-2xl w-full">
            <h3 className="text-lg font-bold text-indigo-400 flex items-center gap-2 mb-3">
              <MdRateReview />
              {t("albumDetails.albumReview")}
            </h3>
            <div className="bg-gray-800 text-white p-4 rounded-lg mb-4 max-h-96 overflow-y-auto">
              <p className="text-gray-300 whitespace-pre-wrap">
                {reviewSelecionada}
              </p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={fecharModalReview}
                className="bg-gray-700 py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
              >
                {t("albumDetails.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerfilPublico;
