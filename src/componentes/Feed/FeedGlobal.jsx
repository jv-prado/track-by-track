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
            Feed Global de Avaliações
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
              className="bg-cinza-escuro rounded-xl overflow-hidden shadow-lg transition-transform hover:scale-[1.02] hover:shadow-xl flex flex-col h-full"
            >
              <div className="flex flex-col sm:flex-row h-full">
                {/* LADO ESQUERDO: Imagem do álbum, nome, artista, usuário e botão Spotify */}
                <div className="flex-grow p-3 flex flex-col">
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
                    <div className="flex flex-col">
                      <span className="font-medium truncate max-w-[200px]">
                        {avaliacao.usuario.nome}
                      </span>
                      <span className="text-xs opacity-70">
                        {formatarData(avaliacao.dataAvaliacao)}
                      </span>
                    </div>
                  </div>

                  {/* Parte média: imagem, nome e artista */}
                  <div className="flex gap-3">
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
                    <div className="flex-grow min-w-0 max-w-full">
                      <h3 className="font-bold text-sm md:text-base line-clamp-1 text-white truncate pr-1">
                        {avaliacao.nome}
                      </h3>
                      <p className="text-verde-destaque text-xs md:text-sm line-clamp-1 font-medium truncate pr-1">
                        {avaliacao.artista}
                      </p>

                      {/* Música favorita e pior música */}
                      {(avaliacao.faixaFavorita || avaliacao.piorFaixa) && (
                        <div className="flex flex-wrap gap-1 mt-1 text-[10px] sm:text-xs max-w-full">
                          {avaliacao.faixaFavorita && (
                            <div className="flex items-center text-red-400 max-w-[calc(50%-4px)]">
                              <IoMdHeart className="mr-0.5 flex-shrink-0" />
                              <span className="truncate">
                                {avaliacao.faixaFavorita === "Faixa favorita"
                                  ? "Favorita"
                                  : avaliacao.faixaFavorita}
                              </span>
                            </div>
                          )}
                          {avaliacao.piorFaixa && (
                            <div className="flex items-center text-yellow-500 max-w-[calc(50%-4px)]">
                              <IoMdHeartDislike className="mr-0.5 flex-shrink-0" />
                              <span className="truncate">
                                {avaliacao.piorFaixa === "Pior faixa"
                                  ? "Pior"
                                  : avaliacao.piorFaixa}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botão do Spotify no final */}
                  <div className="mt-auto pt-2">
                    <a
                      href={
                        usandoDadosDemo
                          ? "https://open.spotify.com/"
                          : `https://open.spotify.com/album/${avaliacao.id}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-2 py-1 bg-black/30 rounded-md text-xs text-gray-300 hover:text-green-400 hover:bg-black/50 transition-colors"
                    >
                      <FaSpotify className="mr-1 text-green-400" />
                      Ouvir no Spotify
                    </a>
                  </div>
                </div>

                {/* LADO DIREITO: Avaliação e progresso */}
                <div className="w-full sm:w-32 flex-shrink-0 bg-cinza p-3 flex sm:flex-col items-center justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-gray-700">
                  {/* Avaliação geral */}
                  <div className="flex sm:flex-col items-center">
                    <div className="text-xs sm:text-sm text-gray-400 sm:mb-1 mr-2 sm:mr-0">
                      Avaliação
                    </div>
                    <div className="bg-verde-destaque text-cinza-escuro rounded-lg px-3 py-1 font-bold text-xl flex items-center justify-center">
                      {formatarMedia(avaliacao.mediaAvaliacao)}
                    </div>
                  </div>

                  {/* Progresso da avaliação */}
                  {avaliacao.progresso && (
                    <div className="flex sm:flex-col items-center sm:mt-4">
                      <div className="text-xs sm:text-sm text-gray-400 sm:mb-1 mr-2 sm:mr-0 hidden sm:block">
                        Progresso
                      </div>
                      <div className="flex flex-col sm:items-center min-w-[80px]">
                        <div className="text-xs text-gray-300 mb-1 text-center">
                          {avaliacao.progresso.avaliadas}/
                          {avaliacao.progresso.total} (
                          {avaliacao.progresso.percentual || 0}%)
                        </div>
                        <div className="w-20 sm:w-full h-2 bg-cinza-escuro rounded-full overflow-hidden">
                          <div
                            className="h-full bg-verde-destaque transition-all"
                            style={{
                              width: `${avaliacao.progresso.percentual || 0}%`,
                            }}
                          ></div>
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
    </div>
  );
};

export default FeedGlobal;
