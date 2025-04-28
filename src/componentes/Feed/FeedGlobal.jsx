import React, { useState, useEffect } from "react";
import { obterAvaliacoesGlobais } from "../../services/firebase/index";
import Carregamento from "../Feedback/Carregamento";
import ErroCarregamento from "../Feedback/ErroCarregamento";
import { formatarData } from "../../services/avaliacoes";
import { FaSpotify } from "react-icons/fa";
import { avaliacoesGlobaisDemo } from "../../data/avaliacoesDemo";
import { useAuth } from "../../contexts/AuthContext";
import { MdMusicNote } from "react-icons/md";
import { IoMdHeart, IoMdHeartDislike } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import { FaRegStar } from "react-icons/fa";
import ModalAvaliacoesUsuario from "./ModalAvaliacoesUsuario";

/**
 * Componente que exibe as últimas avaliações feitas por todos os usuários
 * @returns {JSX.Element} Componente de feed global
 */
const FeedGlobal = () => {
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [usandoDadosDemo, setUsandoDadosDemo] = useState(false);
  const { usuario: usuarioFirebase } = useAuth();
  const navigate = useNavigate();
  const [modalAberto, setModalAberto] = useState(false);
  const [avaliacaoSelecionada, setAvaliacaoSelecionada] = useState(null);

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

  // Buscar as avaliações globais ao montar o componente
  useEffect(() => {
    carregarAvaliacoes();
  }, []);

  // Função para carregar as avaliações
  const carregarAvaliacoes = async () => {
    setCarregando(true);
    setErro(null);
    setUsandoDadosDemo(false);

    // Verificar se o usuário está em modo demo
    const demoToken = localStorage.getItem("demo_token");
    const demoExpiry = localStorage.getItem("demo_token_expiry");
    const modoDemo =
      demoToken && demoExpiry && parseInt(demoExpiry) > Date.now();

    // Se o usuário não estiver autenticado ou estiver em modo demo, usar dados de demonstração
    if (!usuarioFirebase || modoDemo) {
      console.log("Usando dados de demonstração para o feed global");
      setAvaliacoes(avaliacoesGlobaisDemo);
      setUsandoDadosDemo(true);
      setCarregando(false);
      return;
    }

    try {
      const avaliacoesGlobais = await obterAvaliacoesGlobais(30);
      // Validar e processar as imagens antes de definir o estado
      const avaliacoesProcessadas = avaliacoesGlobais.map((avaliacao) => ({
        ...avaliacao,
        imagem: validarUrlImagem(avaliacao.imagem),
        usuario: {
          ...avaliacao.usuario,
          foto: validarUrlImagem(avaliacao.usuario.foto),
        },
      }));
      setAvaliacoes(avaliacoesProcessadas);
    } catch (error) {
      console.error("Erro ao carregar feed global:", error);

      // Se houver erro de permissão, usar dados de demonstração
      if (
        error.code === "permission-denied" ||
        error.message.includes("permissions")
      ) {
        console.log("Erro de permissão, usando dados de demonstração");
        setAvaliacoes(avaliacoesGlobaisDemo);
        setUsandoDadosDemo(true);
      } else {
        setErro(error.message || "Erro ao carregar as avaliações globais");
      }
    } finally {
      setCarregando(false);
    }
  };

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
      <Carregamento mensagem="Carregando avaliações de todos os usuários..." />
    );
  }

  if (erro) {
    return (
      <ErroCarregamento
        mensagem={erro}
        onTentarNovamente={carregarAvaliacoes}
        titulo="Erro ao carregar feed global"
      />
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-verde-destaque flex items-center">
            Feed de Avaliações
            {usandoDadosDemo && (
              <span className="text-xs ml-2 bg-amber-700/20 text-amber-500 px-2 py-1 rounded-full">
                Modo demonstração
              </span>
            )}
          </h2>
        </div>

        <div>
          {/* Botão para atualizar */}
          <button
            onClick={carregarAvaliacoes}
            className="text-xs md:text-sm bg-verde-destaque/20 hover:bg-verde-destaque/30 text-verde-destaque px-3 py-1 rounded-full transition-colors hover:cursor-pointer"
          >
            Atualizar
          </button>
        </div>
      </div>

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
            Nenhuma avaliação encontrada.
          </p>
          <p className="text-gray-500 mt-2">
            Seja o primeiro a avaliar um álbum!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:gap-5">
          {avaliacoes.map((avaliacao, index) => (
            <div
              key={`${avaliacao.id}-${avaliacao.usuario.id}-${index}`}
              className="bg-cinza-escuro rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex flex-col h-full cursor-pointer relative hover:bg-cinza-escuro/90 group"
              onClick={(e) => navegarParaAlbum(avaliacao.id, e)}
              title="Clique para ver detalhes do álbum"
            >
              <div className="flex flex-col lg:flex-row h-full">
                {/* LADO ESQUERDO: Imagem do álbum, nome, artista, usuário e botão Spotify */}
                <div className="flex-grow p-3 flex flex-col min-w-0">
                  {/* Informações do usuário em primeiro lugar */}
                  <div className="flex items-center mb-3 text-xs md:text-sm text-gray-300 min-w-0">
                    <div className="w-6 h-6 md:w-7 md:h-7 rounded-full overflow-hidden bg-gray-800 flex-shrink-0 mr-2 shadow-sm">
                      {usandoDadosDemo ? (
                        <div className="w-full h-full flex items-center justify-center bg-verde-destaque/20 text-verde-destaque">
                          {avaliacao.usuario.nome.charAt(0).toUpperCase()}
                        </div>
                      ) : avaliacao.usuario.foto ? (
                        <img
                          src={avaliacao.usuario.foto}
                          alt={`Foto de ${avaliacao.usuario.nome}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.parentElement.classList.add(
                              "flex",
                              "items-center",
                              "justify-center",
                              "bg-verde-destaque/20"
                            );
                            const fallbackText = document.createElement("div");
                            fallbackText.className =
                              "text-verde-destaque text-xs font-bold";
                            fallbackText.textContent = avaliacao.usuario.nome
                              .charAt(0)
                              .toUpperCase();
                            e.target.parentElement.appendChild(fallbackText);
                          }}
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-verde-destaque/20 text-verde-destaque">
                          {avaliacao.usuario.nome.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate max-w-[150px] md:max-w-[200px]">
                        {avaliacao.usuario.nome}
                      </span>
                      <span className="text-xs opacity-70 truncate max-w-[150px] md:max-w-[200px]">
                        {formatarDataSegura(
                          avaliacao.data || avaliacao.dataAvaliacao
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Parte média: imagem, nome e artista */}
                  <div className="flex gap-3 min-w-0">
                    {/* Imagem do álbum */}
                    <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 bg-cinza-escuro rounded-lg overflow-hidden">
                      {usandoDadosDemo ? (
                        <div className="w-full h-full bg-gradient-to-br from-verde-destaque/10 to-verde-destaque/30 rounded-lg flex items-center justify-center">
                          <MdMusicNote className="text-verde-destaque text-3xl md:text-4xl animate-pulse" />
                        </div>
                      ) : avaliacao.imagem ? (
                        <img
                          src={avaliacao.imagem}
                          alt={`Capa do álbum ${avaliacao.nome}`}
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

                    {/* Nome e artista */}
                    <div className="flex-grow min-w-0">
                      <h3 className="font-bold text-sm md:text-base line-clamp-1 text-white truncate pr-1">
                        {avaliacao.nome}
                      </h3>
                      <p className="text-verde-destaque text-xs md:text-sm line-clamp-1 font-medium truncate pr-1 mb-2">
                        {avaliacao.artista}
                      </p>

                      {/* Botões do Spotify e Ver avaliações */}
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={
                            usandoDadosDemo
                              ? "https://open.spotify.com/"
                              : `https://open.spotify.com/album/${avaliacao.id}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-2 py-1 bg-black/30 rounded-md text-xs text-gray-300 hover:text-green-400 hover:bg-black/50 transition-colors z-20 relative"
                          onClick={(e) => e.stopPropagation()} // Evitar que o clique no botão acione a navegação
                        >
                          <FaSpotify className="mr-1 text-green-400" />
                          <span className="whitespace-nowrap">
                            Ouvir no Spotify
                          </span>
                        </a>

                        <button
                          className="inline-flex items-center px-2 py-1 bg-gradient-to-r from-verde-destaque/20 to-verde-destaque/30 rounded-md text-xs text-verde-destaque hover:from-verde-destaque/30 hover:to-verde-destaque/40 shadow-sm transition-colors z-20 relative cursor-pointer"
                          onClick={(e) => abrirModalAvaliacoes(avaliacao, e)}
                          title="Ver avaliações de faixas deste usuário para este álbum"
                        >
                          <FaRegStar className="mr-1 text-verde-destaque" />
                          <span className="whitespace-nowrap">
                            Ver avaliações
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* LADO DIREITO: Avaliação e progresso */}
                <div className="w-full lg:w-32 xl:w-36 flex-shrink-0 p-3 flex lg:flex-col items-center justify-between lg:justify-center border-t lg:border-t-0 lg:border-l border-gray-700/50 bg-gradient-to-br from-cinza-escuro to-cinza-escuro/95">
                  {/* Avaliação como banner - com cor baseada no progresso e na nota */}
                  <div className="flex lg:flex-col items-center justify-center w-full">
                    <div
                      className={`${
                        // Só aplicar cor baseada na nota se o progresso for 100%
                        (avaliacao.progresso?.percentual || 0) >= 100
                          ? obterCorNota(
                              avaliacao.media || avaliacao.mediaAvaliacao
                            )
                          : "bg-gray-500/50"
                      } text-cinza-escuro rounded-lg px-3 py-1.5 font-bold text-xl flex items-center justify-center shadow-sm w-20 md:w-24 lg:w-full`}
                    >
                      <span
                        className={
                          (avaliacao.progresso?.percentual || 0) >= 100
                            ? "text-cinza-escuro"
                            : "text-gray-200"
                        }
                      >
                        {formatarMedia(
                          avaliacao.media || avaliacao.mediaAvaliacao
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Progresso da avaliação */}
                  {avaliacao.progresso && (
                    <div className="flex lg:flex-col items-center lg:mt-2 w-full">
                      <div className="flex flex-col items-center w-full">
                        <div className="text-xs text-gray-300 mb-1 text-center font-medium truncate w-full">
                          <span className="whitespace-nowrap">
                            Avaliado: {avaliacao.progresso.avaliadas}/
                            {avaliacao.progresso.total}
                          </span>
                        </div>
                        <div className="w-16 md:w-20 lg:w-full h-4 bg-gray-800/70 rounded-full overflow-hidden shadow-inner relative">
                          <div
                            className={`h-full transition-all ${
                              Math.floor(
                                avaliacao.progresso?.percentual || 0
                              ) >= 100
                                ? "bg-verde-destaque"
                                : "bg-gray-500/50"
                            }`}
                            style={{
                              width: `${avaliacao.progresso.percentual || 0}%`,
                            }}
                          ></div>
                          <div
                            className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${
                              Math.floor(
                                avaliacao.progresso?.percentual || 0
                              ) >= 100
                                ? "text-black"
                                : "text-gray-200"
                            }`}
                            style={{
                              textShadow:
                                Math.floor(
                                  avaliacao.progresso?.percentual || 0
                                ) >= 100
                                  ? "none"
                                  : "0px 0px 2px #000, 0px 0px 3px #000",
                            }}
                          >
                            {Math.floor(avaliacao.progresso.percentual || 0)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de avaliações do usuário */}
      {modalAberto && avaliacaoSelecionada && (
        <ModalAvaliacoesUsuario
          usuarioId={avaliacaoSelecionada.usuarioId}
          albumId={avaliacaoSelecionada.albumId}
          onClose={fecharModal}
        />
      )}
    </div>
  );
};

export default FeedGlobal;
