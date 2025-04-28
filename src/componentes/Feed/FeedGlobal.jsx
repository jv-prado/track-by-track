import React, { useState, useEffect } from "react";
import { obterAvaliacoesGlobais } from "../../services/firebase/index";
import Carregamento from "../Feedback/Carregamento";
import ErroCarregamento from "../Feedback/ErroCarregamento";
import { formatarData } from "../../services/avaliacoes";
import { FaSpotify } from "react-icons/fa";
import { avaliacoesGlobaisDemo } from "../../data/avaliacoesDemo";
import { useAuth } from "../../contexts/AuthContext";
import { MdMusicNote } from "react-icons/md";

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
      return "0.0";
    }

    // Limitar a valores entre 0 e 10
    const mediaLimitada = Math.max(0, Math.min(10, media));

    // Verificar se é um número inteiro
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
              <div className="flex h-full">
                {/* Imagem do álbum */}
                <div className="flex-shrink-0 w-20 md:w-28 h-[104px] md:h-[124px] bg-cinza-escuro rounded-l-xl overflow-hidden p-2">
                  {usandoDadosDemo ? (
                    <div className="w-full h-full bg-gray-600 rounded-lg animate-pulse"></div>
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

                {/* Informações da avaliação */}
                <div className="p-2 md:p-3 flex flex-col justify-between flex-grow h-[104px] md:h-[124px] min-w-0">
                  <div className="min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm md:text-base line-clamp-1 text-white truncate">
                          {avaliacao.nome}
                        </h3>
                        <p className="text-verde-destaque text-xs md:text-sm line-clamp-1 font-medium truncate">
                          {avaliacao.artista}
                        </p>
                      </div>

                      <div className="bg-verde-destaque text-cinza-escuro rounded-lg px-2 py-1 font-bold text-base md:text-lg flex items-center justify-center min-w-[34px] flex-shrink-0">
                        {formatarMedia(avaliacao.mediaAvaliacao)}
                      </div>
                    </div>

                    {/* Informações do usuário */}
                    <div className="flex items-center mt-1 md:mt-2 text-xs md:text-sm text-gray-300 min-w-0">
                      <div className="w-5 h-5 md:w-6 md:h-6 rounded-full overflow-hidden bg-gray-800 flex-shrink-0 mr-1 shadow-sm">
                        {avaliacao.usuario.foto ? (
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
                              const fallbackText =
                                document.createElement("div");
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
                      <span className="font-medium truncate min-w-0">
                        {avaliacao.usuario.nome}
                      </span>
                      <span className="mx-1 opacity-70 flex-shrink-0">•</span>
                      <span className="opacity-70 flex-shrink-0">
                        {formatarData(avaliacao.dataAvaliacao)}
                      </span>
                    </div>
                  </div>

                  {/* Botão do Spotify */}
                  <div className="mt-auto pt-1">
                    <a
                      href={`https://open.spotify.com/album/${avaliacao.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-1.5 py-0.5 bg-black/30 rounded-md text-xs md:text-sm text-gray-300 hover:text-green-400 hover:bg-black/50 transition-colors"
                    >
                      <FaSpotify className="mr-1 text-green-400" />
                      Ouvir no Spotify
                    </a>
                  </div>
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
