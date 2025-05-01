import React, { useState, useEffect, useRef, useCallback } from "react";
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
import { GrUpdate } from "react-icons/gr";
import ModalAvaliacoesUsuario from "./ModalAvaliacoesUsuario";
import { useTranslation } from "react-i18next";
import { BsGrid3X3GapFill, BsListUl } from "react-icons/bs";

/**
 * Componente que exibe as últimas avaliações feitas por todos os usuários
 * @returns {JSX.Element} Componente de feed global
 */
const FeedGlobal = () => {
  const { t } = useTranslation();
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState(null);
  const [usandoDadosDemo, setUsandoDadosDemo] = useState(false);
  const { usuario: usuarioFirebase } = useAuth();
  const navigate = useNavigate();
  const [modalAberto, setModalAberto] = useState(false);
  const [avaliacaoSelecionada, setAvaliacaoSelecionada] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [temMaisAvaliacoes, setTemMaisAvaliacoes] = useState(true);
  const observerRef = useRef(null);
  const ultimaAvaliacaoRef = useRef(null);
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
    return 4; // 5 itens por linha em telas grandes
  };

  const gridCols = getGridCols();

  // Quantidade de avaliações carregadas por página
  const LIMITE_POR_PAGINA = 10;

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

  // Observer para detectar quando o usuário chegou ao final da lista
  const ultimoElementoRef = useCallback(
    (node) => {
      if (carregandoMais) return;

      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && (temMaisAvaliacoes || pagina === 1)) {
          carregarMaisAvaliacoes();
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [carregandoMais, temMaisAvaliacoes, pagina]
  );

  // Buscar as avaliações globais ao montar o componente
  useEffect(() => {
    carregarAvaliacoes();
  }, []);

  // Função para carregar as avaliações iniciais
  const carregarAvaliacoes = async () => {
    setCarregando(true);
    setErro(null);
    setUsandoDadosDemo(false);
    setPagina(1);
    setTemMaisAvaliacoes(true);

    // Verificar se o usuário está em modo demo
    const demoToken = localStorage.getItem("demo_token");
    const demoExpiry = localStorage.getItem("demo_token_expiry");
    const modoDemo =
      demoToken && demoExpiry && parseInt(demoExpiry) > Date.now();

    // Se o usuário não estiver autenticado ou estiver em modo demo, usar dados de demonstração
    if (!usuarioFirebase || modoDemo) {
      console.log("Usando dados de demonstração para o feed global");
      // Filtrar apenas avaliações com 100% de progresso
      const avaliacoesFiltradas = avaliacoesGlobaisDemo
        .filter((avaliacao) => (avaliacao.progresso?.percentual || 0) >= 100)
        .slice(0, LIMITE_POR_PAGINA)
        .map((avaliacao) => ({
          ...avaliacao,
          // Definir isPrimeiraAvaliacao com base nos dados ou usar um método consistente para demonstração
          isPrimeiraAvaliacao:
            avaliacao.isPrimeiraAvaliacao !== undefined
              ? avaliacao.isPrimeiraAvaliacao
              : avaliacao.id
              ? parseInt(avaliacao.id.replace(/\D/g, "")[0] || "0") % 2 === 0
              : true,
        }));

      console.log("Avaliações processadas para demo:", avaliacoesFiltradas);

      setAvaliacoes(avaliacoesFiltradas);
      setUsandoDadosDemo(true);
      setCarregando(false);
      // Se os dados demo tiverem menos avaliações que o limite, não há mais para carregar
      setTemMaisAvaliacoes(avaliacoesFiltradas.length >= LIMITE_POR_PAGINA);
      return;
    }

    try {
      const avaliacoesGlobais = await obterAvaliacoesGlobais(LIMITE_POR_PAGINA);
      // Validar e processar as imagens antes de definir o estado
      const avaliacoesProcessadas = avaliacoesGlobais
        .map((avaliacao) => ({
          ...avaliacao,
          imagem: validarUrlImagem(avaliacao.imagem),
          usuario: {
            ...avaliacao.usuario,
            foto: validarUrlImagem(avaliacao.usuario.foto),
          },
          // Preservar propriedades relacionadas a atualizações
          atualizada:
            avaliacao.atualizada ||
            avaliacao.atualizacao ||
            (avaliacao.dataAtualizacao ? true : false) ||
            (avaliacao.atualizacaoTimestamp ? true : false),
        }))
        // Filtrar apenas avaliações com 100% de progresso
        .filter((avaliacao) => (avaliacao.progresso?.percentual || 0) >= 100);

      console.log(
        "Avaliações recebidas do Firebase/Demo:",
        avaliacoesProcessadas
      );

      setAvaliacoes(avaliacoesProcessadas);
      setTemMaisAvaliacoes(avaliacoesProcessadas.length >= LIMITE_POR_PAGINA);

      // Guardar referência da última avaliação carregada
      if (avaliacoesProcessadas.length > 0) {
        ultimaAvaliacaoRef.current =
          avaliacoesProcessadas[avaliacoesProcessadas.length - 1];
      }
    } catch (error) {
      console.error("Erro ao carregar feed global:", error);

      // Se houver erro de permissão, usar dados de demonstração
      if (
        error.code === "permission-denied" ||
        error.message.includes("permissions")
      ) {
        console.log("Erro de permissão, usando dados de demonstração");
        // Filtrar apenas avaliações com 100% de progresso
        const avaliacoesFiltradas = avaliacoesGlobaisDemo
          .filter((avaliacao) => (avaliacao.progresso?.percentual || 0) >= 100)
          .slice(0, LIMITE_POR_PAGINA);

        setAvaliacoes(avaliacoesFiltradas);
        setUsandoDadosDemo(true);
        // Se os dados demo tiverem menos avaliações que o limite, não há mais para carregar
        setTemMaisAvaliacoes(avaliacoesFiltradas.length >= LIMITE_POR_PAGINA);
      } else {
        setErro(error.message || "Erro ao carregar as avaliações globais");
      }
    } finally {
      setCarregando(false);
    }
  };

  // Função para carregar mais avaliações quando o usuário rolar a página
  const carregarMaisAvaliacoes = async () => {
    if (carregandoMais) return;

    setCarregandoMais(true);
    console.log("Carregando mais avaliações da página", pagina + 1);

    // Para dados de demonstração, simplesmente adicionar mais avaliações da lista demo
    if (usandoDadosDemo) {
      const proximaPagina = pagina + 1;
      const inicio = (proximaPagina - 1) * LIMITE_POR_PAGINA;
      const fim = inicio + LIMITE_POR_PAGINA;

      const novasAvaliacoes = avaliacoesGlobaisDemo
        .filter((avaliacao) => (avaliacao.progresso?.percentual || 0) >= 100)
        .slice(inicio, fim)
        .map((avaliacao) => ({
          ...avaliacao,
          // Definir isPrimeiraAvaliacao com base nos dados ou usar um método consistente para demonstração
          isPrimeiraAvaliacao:
            avaliacao.isPrimeiraAvaliacao !== undefined
              ? avaliacao.isPrimeiraAvaliacao
              : avaliacao.id
              ? parseInt(avaliacao.id.replace(/\D/g, "")[0] || "0") % 2 === 0
              : true,
        }));

      if (novasAvaliacoes.length > 0) {
        setAvaliacoes((prev) => [...prev, ...novasAvaliacoes]);
        setPagina(proximaPagina);
      }

      // Verificar se ainda há mais avaliações para carregar
      setTemMaisAvaliacoes(novasAvaliacoes.length >= LIMITE_POR_PAGINA);
      setCarregandoMais(false);
      return;
    }

    try {
      // Usar a última avaliação carregada como ponto de partida para a próxima consulta
      const ultimaAvaliacao = ultimaAvaliacaoRef.current;

      console.log(
        "Buscando a partir da avaliação:",
        ultimaAvaliacao?.id,
        "usuário:",
        ultimaAvaliacao?.usuario?.id
      );

      // Esta função precisará ser modificada no Firebase para suportar paginação
      const novasAvaliacoes = await obterAvaliacoesGlobais(
        LIMITE_POR_PAGINA,
        ultimaAvaliacao
      );

      console.log(`Encontradas ${novasAvaliacoes.length} novas avaliações`);

      // Processar as novas avaliações
      const avaliacoesProcessadas = novasAvaliacoes
        .map((avaliacao) => ({
          ...avaliacao,
          imagem: validarUrlImagem(avaliacao.imagem),
          usuario: {
            ...avaliacao.usuario,
            foto: validarUrlImagem(avaliacao.usuario.foto),
          },
          // Preservar propriedades relacionadas a atualizações
          atualizada:
            avaliacao.atualizada ||
            avaliacao.atualizacao ||
            (avaliacao.dataAtualizacao ? true : false) ||
            (avaliacao.atualizacaoTimestamp ? true : false),
        }))
        .filter((avaliacao) => (avaliacao.progresso?.percentual || 0) >= 100);

      console.log(
        `${avaliacoesProcessadas.length} avaliações processadas com progresso 100%`
      );

      // Adicionar as novas avaliações ao array existente
      if (avaliacoesProcessadas.length > 0) {
        setAvaliacoes((prev) => {
          // Verificar se há duplicatas e apenas adicionar as novas
          const idsExistentes = new Set(
            prev.map((a) => `${a.id}-${a.usuario.id}`)
          );

          const novasAvaliacoesFiltradas = avaliacoesProcessadas.filter(
            (a) => !idsExistentes.has(`${a.id}-${a.usuario.id}`)
          );

          console.log(
            `Adicionando ${novasAvaliacoesFiltradas.length} avaliações únicas`
          );

          // Se existem itens novos, atualizar a referência da última avaliação
          if (novasAvaliacoesFiltradas.length > 0) {
            ultimaAvaliacaoRef.current =
              novasAvaliacoesFiltradas[novasAvaliacoesFiltradas.length - 1];
          }

          return [...prev, ...novasAvaliacoesFiltradas];
        });

        setPagina(pagina + 1);
      }

      // Verificar se ainda há mais avaliações para carregar
      // Mesmo se vier menos que o limite, continuamos tentando carregar mais
      // a menos que não tenha vindo nenhuma avaliação
      setTemMaisAvaliacoes(avaliacoesProcessadas.length > 0);
    } catch (error) {
      console.error("Erro ao carregar mais avaliações:", error);
      // Não mostrar erro para o usuário ao carregar mais, apenas log
    } finally {
      setCarregandoMais(false);
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

  /**
   * Função para verificar se uma avaliação é a primeira (nova) ou atualizada
   * @param {Object} avaliacao - Objeto de avaliação
   * @returns {boolean} Verdadeiro se a avaliação for a primeira, falso se for uma atualização
   */
  const ehPrimeiraAvaliacao = (avaliacao) => {
    // Se for explicitamente marcado como primeira avaliação, retorna true
    const resultado = avaliacao.isPrimeiraAvaliacao === true;

    // Log para debug com mais informações
    console.log(
      `Verificando se avaliação do álbum ${avaliacao.nome} é primeira:`,
      {
        id: avaliacao.id,
        isPrimeiraAvaliacao: avaliacao.isPrimeiraAvaliacao,
        dataAtualizacao: avaliacao.dataAtualizacao,
        dataCompletou100: avaliacao.dataCompletou100,
        resultado,
      }
    );

    return resultado;
  };

  /**
   * Função para calcular quanto tempo resta no período de graça de 1 hora
   * @param {Object} avaliacao - Objeto de avaliação
   * @returns {Object} Objeto com informações sobre o tempo restante
   */
  const calcularTempoRestanteGraca = (avaliacao) => {
    // Se não tiver a data de conclusão 100%, retorna null
    if (!avaliacao.dataCompletou100) return null;

    // Calcular tempo restante
    const dataCompletou = new Date(avaliacao.dataCompletou100);
    const agora = new Date();
    const umaHoraEmMs = 60 * 60 * 1000; // 1 hora em milissegundos
    const tempoPassadoMs = agora.getTime() - dataCompletou.getTime();
    const tempoRestanteMs = Math.max(0, umaHoraEmMs - tempoPassadoMs);

    // Se já passou o período de graça, retorna 0
    if (tempoRestanteMs <= 0)
      return { tempoRestanteMinutos: 0, porcentagem: 0 };

    // Calcular minutos e porcentagem
    const tempoRestanteMinutos = Math.ceil(tempoRestanteMs / (60 * 1000));
    const porcentagem = Math.round((tempoRestanteMs / umaHoraEmMs) * 100);

    return {
      tempoRestanteMinutos,
      porcentagem,
    };
  };

  if (carregando) {
    return <Carregamento mensagem={t("feed.carregando")} />;
  }

  if (erro) {
    return (
      <ErroCarregamento
        mensagem={erro}
        onTentarNovamente={carregarAvaliacoes}
        titulo={t("feed.erroCarregamento")}
      />
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-verde-destaque flex items-center">
            {t("feed.titulo")}
            {usandoDadosDemo && (
              <span className="text-xs ml-2 bg-amber-700/20 text-amber-500 px-2 py-1 rounded-full">
                {t("feed.modoDemo")}
              </span>
            )}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão para alternar modo de visualização, visível apenas se houver resultados */}
          {avaliacoes && avaliacoes.length > 0 && (
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

          {/* Botão para atualizar */}
          <button
            onClick={carregarAvaliacoes}
            className="text-xs md:text-sm bg-verde-destaque/20 hover:bg-verde-destaque/30 text-verde-destaque px-3 py-1 rounded-full transition-colors hover:cursor-pointer flex items-center gap-2"
          >
            {t("feed.atualizar")}
            <GrUpdate className="text-verde-destaque" />
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
            {t("feed.nenhumaAvaliacao")}
          </p>
          <p className="text-gray-500 mt-2">{t("feed.sejaPrimeiro")}</p>
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
                  key={`${avaliacao.id}-${avaliacao.usuario.id}-${index}`}
                  className={`bg-cinza-escuro rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex flex-col h-full cursor-pointer relative hover:bg-cinza-escuro/90 group ${
                    modoVisualizacao === "grade" ? "p-3" : "p-4"
                  }`}
                  onClick={(e) => navegarParaAlbum(avaliacao.id, e)}
                  title={t("feed.cliqueVerDetalhes")}
                  ref={
                    index === avaliacoes.length - 1 ? ultimoElementoRef : null
                  }
                >
                  {/* Tag Novo/Atualizado no topo do card (modo lista e grid) */}
                  {modoVisualizacao === "grade" && (
                    <span
                      className={`absolute top-3 mb-0 text-xs px-4 py-1 border font-semibold bg-black/70 backdrop-blur-sm text-center select-none z-10 shadow left-0 ml-2 rounded-r-full
                        ${
                          ehPrimeiraAvaliacao(avaliacao)
                            ? "bg-orange-500 border-orange-500"
                            : "bg-purple-600 border-purple-600"
                        }`}
                    >
                      {ehPrimeiraAvaliacao(avaliacao)
                        ? t("feed.new", "Novo")
                        : t("feed.updated", "Atualizado")}
                    </span>
                  )}
                  {/* Imagem do álbum */}
                  <div className="w-full aspect-square bg-cinza-escuro rounded-lg overflow-hidden mb-3 relative">
                    {usandoDadosDemo ? (
                      <div className="w-full h-full bg-gradient-to-br from-verde-destaque/10 to-verde-destaque/30 rounded-lg flex items-center justify-center">
                        <MdMusicNote className="text-verde-destaque text-3xl md:text-4xl animate-pulse" />
                      </div>
                    ) : avaliacao.imagem ? (
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
                  {/* Linha com nome, banda, nota e botões */}
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
                      {/* Linha com data da avaliação */}
                      <span className="text-xs opacity-70 truncate max-w-[120px] mt-1 block">
                        {formatarDataSegura(
                          avaliacao.data || avaliacao.dataAvaliacao
                        )}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex flex-col justify-between items-end min-w-[80px] h-full">
                        {modoVisualizacao !== "grade" && (
                          <span
                            className={`text-xs px-3 py-0.5 border font-semibold text-white text-center select-none shadow rounded-l-full
                              ${
                                ehPrimeiraAvaliacao(avaliacao)
                                  ? "bg-orange-500 border-orange-500"
                                  : "bg-purple-600 border-purple-600"
                              }`}
                          >
                            {ehPrimeiraAvaliacao(avaliacao)
                              ? t("feed.new", "Novo")
                              : t("feed.updated", "Atualizado")}
                          </span>
                        )}
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
                  {/* Detalhe centralizado com usuário na base do card */}
                  <div className="flex items-center justify-center mt-4 mb-1">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center shadow-sm">
                      {usandoDadosDemo ? (
                        <div className="w-full h-full flex items-center justify-center bg-verde-destaque/20 text-verde-destaque">
                          {avaliacao.usuario.nome.charAt(0).toUpperCase()}
                        </div>
                      ) : avaliacao.usuario.foto ? (
                        <img
                          src={avaliacao.usuario.foto}
                          alt={t("feed.fotoUsuario", {
                            nome: avaliacao.usuario.nome,
                          })}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-verde-destaque/20 text-verde-destaque">
                          {avaliacao.usuario.nome.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="ml-2 text-xs text-gray-300 truncate max-w-[100px] text-center">
                      {avaliacao.usuario.nome}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:gap-5">
              {avaliacoes.map((avaliacao, index) => (
                <div
                  key={`${avaliacao.id}-${avaliacao.usuario.id}-${index}`}
                  className={`bg-cinza-escuro rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex flex-col h-full cursor-pointer relative hover:bg-cinza-escuro/90 group ${
                    modoVisualizacao === "grade" ? "p-3" : "p-4"
                  }`}
                  onClick={(e) => navegarParaAlbum(avaliacao.id, e)}
                  title={t("feed.cliqueVerDetalhes")}
                  ref={
                    index === avaliacoes.length - 1 ? ultimoElementoRef : null
                  }
                >
                  {/* Tag Novo/Atualizado no topo do card (modo lista e grid) */}
                  {modoVisualizacao === "grade" && (
                    <span
                      className={`absolute top-3 mb-0 text-xs px-4 py-1 border font-semibold bg-black/70 backdrop-blur-sm text-center select-none z-10 shadow left-0 ml-2 rounded-r-full
                        ${
                          ehPrimeiraAvaliacao(avaliacao)
                            ? "bg-orange-500 border-orange-500"
                            : "bg-purple-600 border-purple-600"
                        }`}
                    >
                      {ehPrimeiraAvaliacao(avaliacao)
                        ? t("feed.new", "Novo")
                        : t("feed.updated", "Atualizado")}
                    </span>
                  )}
                  {modoVisualizacao !== "grade" ? (
                    <div className="flex flex-row gap-2 w-full justify-center items-center">
                      {/* Coluna 1: usuário, data, imagem, nome, artista, botões */}
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex flex-row items-center min-w-0 gap-2 mb-2">
                          <div className="w-6 h-6 md:w-7 md:h-7 rounded-full overflow-hidden bg-gray-800 flex-shrink-0 shadow-sm">
                            {usandoDadosDemo ? (
                              <div className="w-full h-full flex items-center justify-center bg-verde-destaque/20 text-verde-destaque">
                                {avaliacao.usuario.nome.charAt(0).toUpperCase()}
                              </div>
                            ) : avaliacao.usuario.foto ? (
                              <img
                                src={avaliacao.usuario.foto}
                                alt={t("feed.fotoUsuario", {
                                  nome: avaliacao.usuario.nome,
                                })}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-verde-destaque/20 text-verde-destaque">
                                {avaliacao.usuario.nome.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className="font-medium truncate max-w-[120px] md:max-w-[180px]">
                            {avaliacao.usuario.nome}
                          </span>
                          {/* Data e horário da avaliação */}
                          {avaliacao.dataAvaliacao && (
                            <span className="ml-2 text-xs text-gray-400 whitespace-nowrap">
                              {(() => {
                                const data = new Date(avaliacao.dataAvaliacao);
                                const dia = data.toLocaleDateString("pt-BR");
                                const hora = data.toLocaleTimeString("pt-BR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                });
                                return `${dia} ${hora}`;
                              })()}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-3 min-w-0 mb-2">
                          {/* Imagem do álbum */}
                          <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 bg-cinza-escuro rounded-lg overflow-hidden">
                            {usandoDadosDemo ? (
                              <div className="w-full h-full bg-gradient-to-br from-verde-destaque/10 to-verde-destaque/30 rounded-lg flex items-center justify-center">
                                <MdMusicNote className="text-verde-destaque text-3xl md:text-4xl animate-pulse" />
                              </div>
                            ) : avaliacao.imagem ? (
                              <img
                                src={avaliacao.imagem}
                                alt={t("feed.capaAlbum", {
                                  nome: avaliacao.nome,
                                })}
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
                                <span className="whitespace-nowrap max-[500px]:hidden">
                                  {t("feed.ouvirSpotify")}
                                </span>
                                <span className="whitespace-nowrap min-[501px]:hidden">
                                  Spotify
                                </span>
                              </a>
                              <button
                                className="inline-flex items-center px-2 py-1 bg-gradient-to-r from-verde-destaque/20 to-verde-destaque/30 rounded-md text-xs text-verde-destaque hover:from-verde-destaque/30 hover:to-verde-destaque/40 shadow-sm transition-colors z-20 relative cursor-pointer"
                                onClick={(e) =>
                                  abrirModalAvaliacoes(avaliacao, e)
                                }
                                title={t("feed.verAvaliacoesUsuario")}
                              >
                                <FaRegStar className="mr-1 text-verde-destaque" />
                                <span className="whitespace-nowrap max-[500px]:hidden">
                                  {t("feed.verAvaliacoes")}
                                </span>
                                <span className="whitespace-nowrap min-[501px]:hidden">
                                  Detalhes
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Coluna 2: tag e nota */}
                      <div className="flex flex-col justify-between items-end min-w-[80px] h-full">
                        {modoVisualizacao !== "grade" && (
                          <span
                            className={`text-xs px-3 py-0.5 border font-semibold text-white text-center select-none shadow rounded-l-full
                              ${
                                ehPrimeiraAvaliacao(avaliacao)
                                  ? "bg-orange-500 border-orange-500"
                                  : "bg-purple-600 border-purple-600"
                              }`}
                          >
                            {ehPrimeiraAvaliacao(avaliacao)
                              ? t("feed.new", "Novo")
                              : t("feed.updated", "Atualizado")}
                          </span>
                        )}
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
                  ) : (
                    <div className="flex flex-col lg:flex-row h-full">
                      {/* LADO ESQUERDO: Imagem do álbum, nome, artista, usuário e botão Spotify */}
                      <div className="flex-grow p-3 flex flex-col min-w-0 relative">
                        {/* Informações do usuário e nota (em telas pequenas) */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex flex-row items-center min-w-0 gap-2">
                            <div className="w-6 h-6 md:w-7 md:h-7 rounded-full overflow-hidden bg-gray-800 flex-shrink-0 shadow-sm">
                              {usandoDadosDemo ? (
                                <div className="w-full h-full flex items-center justify-center bg-verde-destaque/20 text-verde-destaque">
                                  {avaliacao.usuario.nome
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>
                              ) : avaliacao.usuario.foto ? (
                                <img
                                  src={avaliacao.usuario.foto}
                                  alt={t("feed.fotoUsuario", {
                                    nome: avaliacao.usuario.nome,
                                  })}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-verde-destaque/20 text-verde-destaque">
                                  {avaliacao.usuario.nome
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>
                              )}
                            </div>
                            <span className="font-medium truncate max-w-[120px] md:max-w-[180px]">
                              {avaliacao.usuario.nome}
                            </span>
                            {/* Data e horário da avaliação */}
                            {avaliacao.dataAvaliacao && (
                              <span className="ml-2 text-xs text-gray-400 whitespace-nowrap">
                                {(() => {
                                  const data = new Date(
                                    avaliacao.dataAvaliacao
                                  );
                                  const dia = data.toLocaleDateString("pt-BR");
                                  const hora = data.toLocaleTimeString(
                                    "pt-BR",
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  );
                                  return `${dia} ${hora}`;
                                })()}
                              </span>
                            )}
                          </div>

                          {/* Nota em telas pequenas/médias (visível apenas até lg) */}
                          <div className="lg:hidden flex flex-col items-center">
                            <div
                              className={`${obterCorNota(
                                avaliacao.media || avaliacao.mediaAvaliacao
                              )} text-cinza-escuro rounded-lg px-2 py-1 font-bold text-lg flex items-center justify-center shadow-sm w-13 md:w-20 mt-2`}
                            >
                              <span className="text-cinza-escuro">
                                {formatarMedia(
                                  avaliacao.media || avaliacao.mediaAvaliacao
                                )}
                              </span>
                            </div>
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
                                alt={t("feed.capaAlbum", {
                                  nome: avaliacao.nome,
                                })}
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
                                <span className="whitespace-nowrap max-[500px]:hidden">
                                  {t("feed.ouvirSpotify")}
                                </span>
                                <span className="whitespace-nowrap min-[501px]:hidden">
                                  Spotify
                                </span>
                              </a>

                              <button
                                className="inline-flex items-center px-2 py-1 bg-gradient-to-r from-verde-destaque/20 to-verde-destaque/30 rounded-md text-xs text-verde-destaque hover:from-verde-destaque/30 hover:to-verde-destaque/40 shadow-sm transition-colors z-20 relative cursor-pointer"
                                onClick={(e) =>
                                  abrirModalAvaliacoes(avaliacao, e)
                                }
                                title={t("feed.verAvaliacoesUsuario")}
                              >
                                <FaRegStar className="mr-1 text-verde-destaque" />
                                <span className="whitespace-nowrap max-[500px]:hidden">
                                  {t("feed.verAvaliacoes")}
                                </span>
                                <span className="whitespace-nowrap min-[501px]:hidden">
                                  Detalhes
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* LADO DIREITO: Avaliação (apenas visível em lg) */}
                      <div className="mt-4 hidden lg:flex w-32 xl:w-36 flex-shrink-0 p-3 lg:flex-col items-end justify-center border-t lg:border-t-0 lg:border-l border-gray-700/50 bg-gradient-to-br from-cinza-escuro to-cinza-escuro/95">
                        {/* Avaliação como banner alinhada à direita */}
                        <div className="flex lg:flex-col items-end justify-end w-full">
                          <div
                            className={`${obterCorNota(
                              avaliacao.media || avaliacao.mediaAvaliacao
                            )} text-cinza-escuro rounded-lg px-3 py-1.5 font-bold text-xl flex items-center justify-center shadow-sm w-20 md:w-20 lg:w-20 ml-auto`}
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
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Indicador de carregamento quando estiver buscando mais avaliações */}
          {carregandoMais && (
            <div className="py-4 flex justify-center items-center">
              <div className="w-8 h-8 border-4 border-verde-destaque/20 border-t-verde-destaque rounded-full animate-spin"></div>
              <span className="ml-2 text-sm text-verde-destaque">
                {t("feed.carregandoMais")}
              </span>
            </div>
          )}
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
