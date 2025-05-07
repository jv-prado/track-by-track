import React, { useState, useEffect, useRef, useCallback } from "react";
import { obterAvaliacoesGlobais } from "../../services/firebase/index";
import Carregamento from "../Feedback/Carregamento";
import ErroCarregamento from "../Feedback/ErroCarregamento";
import { formatarData } from "../../services/avaliacoes";
import { FaSpotify } from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";
import { MdMusicNote } from "react-icons/md";
import { IoMdHeart, IoMdHeartDislike } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import { FaRegStar } from "react-icons/fa";
import { GrUpdate } from "react-icons/gr";
import ModalAvaliacoesUsuario from "./ModalAvaliacoesUsuario";
import { useTranslation } from "react-i18next";
import { BsGrid3X3GapFill, BsListUl } from "react-icons/bs";
import {
  MdRateReview,
  MdDelete,
  MdEdit,
  MdSave,
  MdCancel,
} from "react-icons/md";
import {
  adicionarComentarioResenha,
  buscarComentariosResenha,
  editarComentarioResenha,
  excluirComentarioResenha,
} from "../../services/firebase";
import i18n from "../../i18n";

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
  const { usuario: usuarioFirebase } = useAuth();
  const navigate = useNavigate();
  const [modalAberto, setModalAberto] = useState(false);
  const [avaliacaoSelecionada, setAvaliacaoSelecionada] = useState(null);
  const [modalReviewAberto, setModalReviewAberto] = useState(false);
  const [reviewSelecionada, setReviewSelecionada] = useState("");
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
  const [comentarios, setComentarios] = useState([]);
  const [novoComentario, setNovoComentario] = useState("");
  const [comentarioEditando, setComentarioEditando] = useState(null);
  const [textoEdicao, setTextoEdicao] = useState("");

  // Padronização da função de alternância de modo de visualização
  const alternarModoVisualizacao = () => {
    setFade(false);
    setTimeout(() => {
      setModoVisualizacao((prev) => (prev === "grade" ? "lista" : "grade"));
      setFade(true);
    }, 180);
  };

  // Adicionar useEffect para salvar a preferência sempre que modoVisualizacao mudar
  useEffect(() => {
    localStorage.setItem("preferenciaModoVisualizacao", modoVisualizacao);
  }, [modoVisualizacao]);

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
    if (windowWidth < 1100) return 3; // 2 itens por linha em telas menores que 1100px
    if (windowWidth < 1500) return 4; // 3 itens por linha em telas médias
    return 5; // 4 itens por linha em telas grandes
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

  // Função que verifica rigorosamente se um álbum está 100% avaliado
  const verificarProgresso100 = (avaliacao) => {
    // Se não existe o objeto de progresso, não está completo
    if (!avaliacao.progresso) {
      console.log(`Álbum ${avaliacao.nome} não tem objeto progresso`);
      return false;
    }

    // Obter o valor percentual convertendo para número para garantir comparação correta
    const percentual = Number(avaliacao.progresso.percentual);

    // Logging detalhado para depuração
    console.log(`Álbum: ${avaliacao.nome || "sem nome"}`);
    console.log(`  ID: ${avaliacao.id}`);
    console.log(`  Progresso objeto completo:`, avaliacao.progresso);
    console.log(
      `  Progresso.percentual (tipo: ${typeof avaliacao.progresso
        .percentual}): ${avaliacao.progresso.percentual}`
    );
    console.log(
      `  Convertido para Number: ${percentual} (${typeof percentual})`
    );

    // Verificar se é exatamente 100 (comparação estrita)
    const ehCem = percentual === 100;
    console.log(`  É exatamente 100%: ${ehCem}`);

    return ehCem;
  };

  // Função para carregar as avaliações iniciais
  const carregarAvaliacoes = async () => {
    setCarregando(true);
    setErro(null);
    setPagina(1);
    setTemMaisAvaliacoes(true);

    try {
      const avaliacoesGlobais = await obterAvaliacoesGlobais(LIMITE_POR_PAGINA);

      // Examinar cada avaliação antes do processamento
      console.log("====== AVALIAÇÕES ORIGINAIS DO SERVIDOR ======");
      avaliacoesGlobais.forEach((av, idx) => {
        console.log(`Avaliação #${idx + 1}: ${av.nome}, ID: ${av.id}`);
        console.log(`  Usuário: ${av.usuario.nome}, ID: ${av.usuario.id}`);
        console.log(`  Progresso:`, av.progresso);
        console.log(`  Progresso.percentual: ${av.progresso?.percentual}`);
        if (av.progresso?.percentual !== 100) {
          console.log(
            `  ⚠️ ATENÇÃO: Percentual diferente de 100: ${av.progresso?.percentual}`
          );
        }
      });

      // Validar e processar as imagens antes de definir o estado
      // Mantenha todo o processamento, mas mude apenas a filtragem para garantir 100%
      let avaliacoesProcessadas = avaliacoesGlobais.map((avaliacao) => ({
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
        // Não alteramos o progresso aqui, apenas passamos adiante
      }));

      // Agora aplicamos o filtro estrito para exatamente 100%
      console.log(
        `Antes da filtragem: ${avaliacoesProcessadas.length} avaliações`
      );

      // Filtra apenas avaliações com 100% de progresso
      avaliacoesProcessadas = avaliacoesProcessadas.filter((avaliacao) => {
        // Conversão para garantir comparação numérica
        const percentual = Number(avaliacao.progresso?.percentual);
        const ehCem = percentual === 100;

        console.log(
          `Filtragem - ${avaliacao.nome}: percentual=${percentual}, é 100%=${ehCem}`
        );

        return ehCem;
      });

      console.log(
        `Após filtragem: ${avaliacoesProcessadas.length} avaliações com exatamente 100% de progresso`
      );

      // Atualiza o estado com as avaliações filtradas
      setAvaliacoes(avaliacoesProcessadas);
      setTemMaisAvaliacoes(avaliacoesProcessadas.length >= LIMITE_POR_PAGINA);

      // Guardar referência da última avaliação carregada
      if (avaliacoesProcessadas.length > 0) {
        ultimaAvaliacaoRef.current =
          avaliacoesProcessadas[avaliacoesProcessadas.length - 1];
      }
    } catch (error) {
      console.error("Erro ao carregar feed global:", error);
      setErro(error.message || "Erro ao carregar as avaliações globais");
    } finally {
      setCarregando(false);
    }
  };

  // Função para carregar mais avaliações quando o usuário rolar a página
  const carregarMaisAvaliacoes = async () => {
    if (carregandoMais) return;

    setCarregandoMais(true);
    console.log("Carregando mais avaliações da página", pagina + 1);

    try {
      // Usar a última avaliação carregada como ponto de partida para a próxima consulta
      const ultimaAvaliacao = ultimaAvaliacaoRef.current;

      // Esta função precisará ser modificada no Firebase para suportar paginação
      const novasAvaliacoes = await obterAvaliacoesGlobais(
        LIMITE_POR_PAGINA,
        ultimaAvaliacao
      );

      console.log(`Encontradas ${novasAvaliacoes.length} novas avaliações`);

      // Examinar cada avaliação antes do processamento
      console.log("====== NOVAS AVALIAÇÕES DO SERVIDOR ======");
      novasAvaliacoes.forEach((av, idx) => {
        console.log(`Nova Avaliação #${idx + 1}: ${av.nome}, ID: ${av.id}`);
        console.log(`  Usuário: ${av.usuario.nome}, ID: ${av.usuario.id}`);
        console.log(`  Progresso:`, av.progresso);
        console.log(`  Progresso.percentual: ${av.progresso?.percentual}`);
        if (av.progresso?.percentual !== 100) {
          console.log(
            `  ⚠️ ATENÇÃO: Percentual diferente de 100: ${av.progresso?.percentual}`
          );
        }
      });

      // Processar as novas avaliações com a mesma lógica anterior
      let avaliacoesProcessadas = novasAvaliacoes.map((avaliacao) => ({
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
        temReview:
          typeof avaliacao.review === "string" ||
          (avaliacao.preferencias &&
            typeof avaliacao.preferencias.review === "string"),
      }));

      // Aplicar o filtro estrito para 100%
      console.log(
        `Antes da filtragem: ${avaliacoesProcessadas.length} novas avaliações`
      );

      // Filtra apenas avaliações com 100% de progresso
      avaliacoesProcessadas = avaliacoesProcessadas.filter((avaliacao) => {
        // Conversão para garantir comparação numérica
        const percentual = Number(avaliacao.progresso?.percentual);
        const ehCem = percentual === 100;

        console.log(
          `Filtragem de novas - ${avaliacao.nome}: percentual=${percentual}, é 100%=${ehCem}`
        );

        return ehCem;
      });

      console.log(
        `Após filtragem: ${avaliacoesProcessadas.length} novas avaliações com exatamente 100% de progresso`
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
      if (data instanceof Date) {
        return formatarData(data);
      }

      if (data.segundos) {
        return formatarData(new Date(data.segundos * 1000));
      }

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

  // Função de carregar comentários com console.logs
  useEffect(() => {
    const carregarComentarios = async () => {
      if (modalReviewAberto && avaliacaoSelecionada) {
        try {
          console.log("Carregando comentários para:", avaliacaoSelecionada);
          setComentarios([]);
          const lista = await buscarComentariosResenha(
            avaliacaoSelecionada.albumId,
            avaliacaoSelecionada.usuarioId
          );
          // Ordenar por data crescente
          lista.sort((a, b) => (a.data?.seconds || 0) - (b.data?.seconds || 0));
          console.log("Comentários carregados:", lista);
          setComentarios(lista);
        } catch (e) {
          console.error("Erro ao carregar comentários:", e);
          setComentarios([]);
        }
      }
    };
    carregarComentarios();
    // eslint-disable-next-line
  }, [modalReviewAberto, avaliacaoSelecionada]);

  // Função de enviar comentário atualizada para incluir mais dados do usuário
  const enviarComentario = async () => {
    try {
      console.log("Tentando enviar comentário");

      if (!avaliacaoSelecionada) {
        console.error("Erro: avaliacaoSelecionada é null ou undefined");
        alert("Erro ao salvar comentário: dados da avaliação não encontrados");
        return;
      }

      if (!novoComentario) {
        console.log("Comentário vazio, não será enviado");
        return;
      }

      console.log("Dados de comentário:", {
        albumId: avaliacaoSelecionada.albumId,
        usuarioId: avaliacaoSelecionada.usuarioId,
        autor: usuarioFirebase?.displayName || "Anônimo",
        texto: novoComentario,
        autorId: usuarioFirebase?.uid || null,
        autorFoto: usuarioFirebase?.photoURL || null,
      });

      await adicionarComentarioResenha({
        albumId: avaliacaoSelecionada.albumId,
        usuarioId: avaliacaoSelecionada.usuarioId,
        autor: usuarioFirebase?.displayName || "Anônimo",
        texto: novoComentario,
        autorId: usuarioFirebase?.uid || null,
        autorFoto: usuarioFirebase?.photoURL || null,
      });

      console.log("Comentário enviado com sucesso!");
      setNovoComentario("");

      // Recarregar comentários após enviar
      const lista = await buscarComentariosResenha(
        avaliacaoSelecionada.albumId,
        avaliacaoSelecionada.usuarioId
      );
      lista.sort((a, b) => (a.data?.seconds || 0) - (b.data?.seconds || 0));
      setComentarios(lista);
    } catch (e) {
      console.error("Erro ao enviar comentário:", e);
      alert("Erro ao salvar comentário. Tente novamente.");
    }
  };

  // Funções para editar e excluir comentários
  const iniciarEdicaoComentario = (comentario) => {
    setComentarioEditando(comentario.id);
    setTextoEdicao(comentario.texto);
  };

  const cancelarEdicaoComentario = () => {
    setComentarioEditando(null);
    setTextoEdicao("");
  };

  const salvarEdicaoComentario = async (comentarioId) => {
    try {
      if (!textoEdicao.trim()) return;

      await editarComentarioResenha(comentarioId, textoEdicao.trim());

      // Atualizar a lista de comentários
      const lista = await buscarComentariosResenha(
        avaliacaoSelecionada.albumId,
        avaliacaoSelecionada.usuarioId
      );
      lista.sort((a, b) => (a.data?.seconds || 0) - (b.data?.seconds || 0));
      setComentarios(lista);

      // Resetar estado de edição
      setComentarioEditando(null);
      setTextoEdicao("");
    } catch (e) {
      console.error("Erro ao editar comentário:", e);
      alert("Erro ao editar comentário. Tente novamente.");
    }
  };

  const excluirComentario = async (comentarioId) => {
    try {
      if (confirm("Tem certeza que deseja excluir este comentário?")) {
        await excluirComentarioResenha(comentarioId);

        // Atualizar a lista removendo o comentário excluído
        setComentarios(comentarios.filter((c) => c.id !== comentarioId));
      }
    } catch (e) {
      console.error("Erro ao excluir comentário:", e);
      alert("Erro ao excluir comentário. Tente novamente.");
    }
  };

  const formatarDataComentario = (timestamp) => {
    if (!timestamp) return "";
    let data;
    if (timestamp instanceof Date) {
      data = timestamp;
    } else if (timestamp.seconds) {
      data = new Date(timestamp.seconds * 1000);
    } else {
      data = new Date(timestamp);
    }
    if (isNaN(data)) return "";
    const agora = new Date();
    const diffMs = agora - data;
    const diffSegs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSegs / 60);
    const diffHoras = Math.floor(diffMins / 60);
    const diffDias = Math.floor(diffHoras / 24);
    if (diffSegs < 60) return t("feed.agora");
    if (diffMins < 60) return t("feed.minutosAtras", { count: diffMins });
    if (diffHoras < 24) return t("feed.horasAtras", { count: diffHoras });
    if (diffDias < 7) return t("feed.diasAtras", { count: diffDias });
    return data.toLocaleDateString(i18n.language || "pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  // Para garantir que nenhuma avaliação com progresso diferente de 100% seja exibida
  // Aplicamos uma última filtragem antes da renderização
  const avaliacoesParaRenderizar = avaliacoes.filter((av) => {
    const percentual = Number(av.progresso?.percentual);
    return percentual === 100;
  });

  // Aviso se algo passou pelo filtro incorretamente
  if (avaliacoes.length !== avaliacoesParaRenderizar.length) {
    console.warn(
      `⚠️ AVISO: ${
        avaliacoes.length - avaliacoesParaRenderizar.length
      } avaliações com progresso diferente de 100% foram removidas antes da renderização`
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-verde-destaque flex items-center">
            {t("feed.titulo")}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão para atualizar */}
          <button
            onClick={carregarAvaliacoes}
            className="ml-2 flex items-center justify-center px-3 py-1.5 h-10 rounded-md text-sm bg-gray-800 text-white hover:bg-gray-700 transition-colors gap-2 group focus:text-verde-destaque active:text-verde-destaque"
            aria-label="Atualizar feed"
            title="Atualizar feed"
          >
            <GrUpdate className="text-white group-focus:text-verde-destaque group-active:text-verde-destaque transition-colors" />
            <span className="text-white group-focus:text-verde-destaque group-active:text-verde-destaque transition-colors">
              {t("feed.atualizar")}
            </span>
          </button>
          {/* Alternância de visualização: mobile = 1 botão, desktop = 2 botões on/off */}
          {avaliacoesParaRenderizar && avaliacoesParaRenderizar.length > 0 && (
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

      {avaliacoesParaRenderizar.length === 0 ? (
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
              {avaliacoesParaRenderizar.map((avaliacao, index) => (
                <div
                  key={`${avaliacao.id}-${avaliacao.usuario.id}-${index}`}
                  className={`bg-cinza-escuro rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex flex-col h-full cursor-pointer relative hover:bg-cinza-escuro/90 group ${
                    modoVisualizacao === "grade" ? "p-3" : "p-4"
                  }`}
                  onClick={(e) => navegarParaAlbum(avaliacao.id, e)}
                  title={t("feed.cliqueVerDetalhes")}
                  ref={
                    index === avaliacoesParaRenderizar.length - 1
                      ? ultimoElementoRef
                      : null
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
                  <div className="relative w-full"></div>
                  <div className="w-full aspect-square bg-cinza-escuro rounded-lg overflow-hidden  relative">
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
                    <div
                      className={`${obterCorNota(
                        avaliacao.media || avaliacao.mediaAvaliacao
                      )} text-cinza-escuro rounded-lg px-2 py-1 font-bold text-lg flex items-center min-w-11 justify-center shadow-sm my-auto absolute bottom-0.5 right-0.5 shadow-lg`}
                    >
                      <span className="text-cinza-escuro w-full text-center">
                        {formatarMedia(
                          avaliacao.media || avaliacao.mediaAvaliacao
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Nome do álbum, artista e data - apenas no modo grid */}
                  <div className="flex flex-col items-center mb-2">
                    {/* Botões de ação: resenha, avaliações, spotify e nota final */}
                    <div className="flex justify-end w-full items-center">
                      {/* Mostra a nota do usuário no álbum, absoluta sobre a imagem apenas no modo grid */}
                    </div>

                    <h3
                      className="font-bold mt-4 text-sm md:text-base line-clamp-1 text-white truncate pr-1 text-center max-w-[90%] text-ellipsis"
                      style={{ wordBreak: "break-word" }}
                      title={avaliacao.nome}
                    >
                      {avaliacao.nome}
                    </h3>
                    <p
                      className="text-verde-destaque text-xs md:text-sm line-clamp-1 font-medium truncate pr-1 mb-0 text-center max-w-[90%] text-ellipsis"
                      style={{ wordBreak: "break-word" }}
                      title={avaliacao.artista}
                    >
                      {avaliacao.artista}
                    </p>
                    <span className="text-xs opacity-70 truncate max-w-[120px] mt-1 block text-center">
                      {formatarDataSegura(
                        avaliacao.data || avaliacao.dataAvaliacao
                      )}
                    </span>
                  </div>
                  {/* Detalhe centralizado com usuário na base do card */}
                  <div className="flex flex-col items-center justify-center mt-1">
                    <div className="flex flex-row items-center justify-center gap-2 mb-2">
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
                    <div
                      className="flex items-center justify-center cursor-pointer hover:bg-gray-800/50 rounded-full px-2 py-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (avaliacao.usuario.id) {
                          navigate(`/perfil/${avaliacao.usuario.id}`);
                        }
                      }}
                      title={t(
                        "feed.verPerfilUsuario",
                        "Ver perfil do usuário"
                      )}
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center shadow-sm">
                        {avaliacao.usuario.foto ? (
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
                    {/* Botão de resenha no modo grid, abaixo do usuário */}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:gap-5">
              {avaliacoesParaRenderizar.map((avaliacao, index) => (
                <div
                  key={`${avaliacao.id}-${avaliacao.usuario.id}-${index}`}
                  className={`bg-cinza-escuro rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex flex-col h-full cursor-pointer relative hover:bg-cinza-escuro/90 group ${
                    modoVisualizacao === "grade" ? "p-3" : "p-4"
                  }`}
                  onClick={(e) => navegarParaAlbum(avaliacao.id, e)}
                  title={t("feed.cliqueVerDetalhes")}
                  ref={
                    index === avaliacoesParaRenderizar.length - 1
                      ? ultimoElementoRef
                      : null
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
                  <div className="flex flex-row gap-2 w-full justify-center items-center">
                    {/* Coluna 1: usuário, data, imagem, nome, artista, botões */}
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex flex-row items-center min-w-0 gap-2 mb-2">
                        <div
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-800/50 rounded-full px-2 py-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (avaliacao.usuario.id) {
                              navigate(`/perfil/${avaliacao.usuario.id}`);
                            }
                          }}
                          title={t(
                            "feed.verPerfilUsuario",
                            "Ver perfil do usuário"
                          )}
                        >
                          <div className="w-6 h-6 md:w-7 md:h-7 rounded-full overflow-hidden bg-gray-800 flex-shrink-0 shadow-sm">
                            {avaliacao.usuario.foto ? (
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
                        </div>
                        {/* Data e horário da avaliação */}
                        <span className="text-xs text-gray-400">
                          {formatarDataSegura(
                            avaliacao.data || avaliacao.dataAvaliacao
                          )}
                        </span>
                      </div>
                      <div className="flex gap-3 min-w-0 mb-2">
                        {/* Imagem do álbum */}
                        <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 bg-cinza-escuro rounded-lg overflow-hidden">
                          {avaliacao.imagem ? (
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
                          {/* Botões de ação: resenha, avaliações, spotify */}
                          <div className="flex flex-wrap gap-2">
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
                              onClick={(e) =>
                                abrirModalAvaliacoes(avaliacao, e)
                              }
                              title={t("feed.faixaPorFaixa", "Faixa por faixa")}
                            >
                              <FaRegStar className="mr-1 text-base text-white" />
                              <span className="whitespace-nowrap max-[500px]:hidden">
                                {t("feed.faixaPorFaixa", "Faixa por faixa")}
                              </span>
                              <span className="whitespace-nowrap min-[501px]:hidden">
                                {t("feed.trackByTrack", "Track by Track")}
                              </span>
                            </button>
                            <a
                              href={`https://open.spotify.com/album/${avaliacao.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center bg-green-600 hover:bg-green-500 text-white rounded-md text-xs px-2 py-1 transition-colors shadow-sm z-20 relative"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <FaSpotify className="mr-1 text-base text-white" />
                              <span className="whitespace-nowrap max-[500px]:hidden">
                                {t("feed.ouvirSpotify")}
                              </span>
                              <span className="whitespace-nowrap min-[501px]:hidden">
                                Spotify
                              </span>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Coluna 2: tag e nota */}
                    <div className="flex flex-col justify-between items-end min-w-[80px] h-full">
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
                      <div
                        className={`${obterCorNota(
                          avaliacao.media || avaliacao.mediaAvaliacao
                        )} text-cinza-escuro rounded-lg px-2 py-1 font-bold text-lg flex items-center justify-center shadow-sm my-auto
                        w-12 md:w-16 sm:w-12 xs:w-10 min-w-[2rem] max-w-[3rem] text-sm md:text-lg`}
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

      {/* Modal de resenha */}
      {modalReviewAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] px-2 md:px-4">
          <div className="bg-cinza-escuro rounded-xl p-5 max-w-2xl w-full overflow-x-hidden">
            <h3 className="text-lg font-bold text-indigo-400 flex items-center gap-2 mb-3">
              <MdRateReview />
              {t("albumDetails.albumReview")}
            </h3>
            <div className="bg-gray-800 text-white p-4 rounded-lg mb-4 max-h-96 overflow-y-auto overflow-x-hidden">
              {/* Autor da review e data */}
              {(() => {
                const avaliacao = avaliacoesParaRenderizar.find(
                  (a) =>
                    a.id === avaliacaoSelecionada?.albumId &&
                    a.usuario.id === avaliacaoSelecionada?.usuarioId
                );
                if (!avaliacao) return null;
                return (
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                      {avaliacao.usuario.foto ? (
                        <img
                          src={avaliacao.usuario.foto}
                          alt={`Foto de ${avaliacao.usuario.nome}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-indigo-700 text-white">
                          {avaliacao.usuario.nome.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-verde-destaque text-base">
                        {avaliacao.usuario.nome}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatarDataSegura(
                          avaliacao.data || avaliacao.dataAvaliacao
                        )}
                      </span>
                    </div>
                  </div>
                );
              })()}
              <p className="text-gray-300 whitespace-pre-wrap">
                {reviewSelecionada}
              </p>
            </div>
            {/* Campo para novo comentário */}
            <div className="mb-3">
              <textarea
                className="w-full h-20 bg-gray-900 text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
                placeholder={t("feed.escrevaComentario")}
                value={novoComentario}
                onChange={(e) => setNovoComentario(e.target.value)}
              />
              <button
                onClick={enviarComentario}
                className="bg-indigo-700 hover:bg-indigo-600 text-white py-1 px-4 rounded-lg transition-colors cursor-pointer"
                disabled={novoComentario.length === 0}
              >
                {t("feed.comentar")}
              </button>
            </div>
            {/* Lista de comentários */}
            <div className="mb-4">
              <h4 className="text-sm font-bold text-gray-300 mb-2">
                {t("feed.comentarios")}
              </h4>
              {comentarios.length === 0 ? (
                <p className="text-gray-400 text-xs">
                  {t("feed.nenhumComentario")}
                </p>
              ) : (
                <ul className="space-y-2 max-h-60 overflow-y-auto overflow-x-hidden pr-1">
                  {comentarios.map((c) => (
                    <li
                      key={c.id}
                      className="bg-gray-900 rounded p-3 text-sm text-gray-200"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {/* Foto do usuário */}
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-800 flex-shrink-0">
                          {c.autorFoto ? (
                            <img
                              src={c.autorFoto}
                              alt={`Foto de ${c.autor}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-indigo-700 text-white">
                              {c.autor?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                          )}
                        </div>

                        {/* Nome e data */}
                        <div>
                          <span className="font-semibold text-verde-destaque">
                            {c.autor}
                          </span>
                          <div className="text-xs text-gray-400">
                            {formatarDataComentario(c.data)}
                            {c.editado && (
                              <span className="ml-1">{t("feed.editado")}</span>
                            )}
                          </div>
                        </div>

                        {/* Botões de edição/exclusão */}
                        {usuarioFirebase?.uid === c.autorId && (
                          <div className="ml-auto flex gap-1">
                            <button
                              onClick={() => iniciarEdicaoComentario(c)}
                              className="text-gray-400 hover:text-white p-1 rounded"
                              title={t("feed.editarComentario")}
                            >
                              <MdEdit size={16} />
                            </button>
                            <button
                              onClick={() => excluirComentario(c.id)}
                              className="text-red-400 hover:text-red-300 p-1 rounded"
                              title={t("feed.excluirComentario")}
                            >
                              <MdDelete size={16} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Conteúdo do comentário */}
                      {comentarioEditando === c.id ? (
                        <div>
                          <textarea
                            className="w-full bg-gray-800 text-white p-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm mb-2"
                            value={textoEdicao}
                            onChange={(e) => setTextoEdicao(e.target.value)}
                            rows={3}
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={cancelarEdicaoComentario}
                              className="text-gray-400 hover:text-white flex items-center gap-1 text-xs"
                            >
                              <MdCancel size={14} /> {t("feed.cancelar")}
                            </button>
                            <button
                              onClick={() => salvarEdicaoComentario(c.id)}
                              className="bg-indigo-700 hover:bg-indigo-600 text-white px-2 py-1 rounded flex items-center gap-1 text-xs"
                            >
                              <MdSave size={14} /> {t("feed.salvar")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="whitespace-pre-line break-words">
                          {c.texto}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
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

export default FeedGlobal;
