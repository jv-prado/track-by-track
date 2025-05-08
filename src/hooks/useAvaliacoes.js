import { useState, useEffect } from "react";
import {
  obterAlbunsUnicos,
  calcularMediaAlbum,
  calcularProgressoAvaliacao,
  buscarDetalhesAlbumSeguro,
  buscarDetalhesAlbunsEmLote,
  carregarCacheAlbuns,
  getAvaliacoesFaixas,
  getMapaFaixasAlbuns,
  setAvaliacoesFaixas,
  setMapaFaixasAlbuns,
  carregarDadosLocalStorage,
} from "../services/avaliacoes";
import { buscarFaixasPorAlbum } from "../services/spotify";
import { isAuthenticated, recuperarAutenticacao } from "../services/auth";
import {
  getUsuarioAtual,
  obterAlbunsAvaliados,
} from "../services/firebase/index";
import { carregarAvaliacoesSincronizadas } from "../services/sync";

/**
 * Hook personalizado para gerenciar as avaliações de álbuns
 * @param {Object} props - Propriedades do hook
 * @param {string} props.termoPesquisaInicial - Termo de pesquisa inicial
 * @returns {Object} Estados e funções para gerenciar avaliações
 */
export default function useAvaliacoes({ termoPesquisaInicial = "" } = {}) {
  const [albunsAvaliados, setAlbunsAvaliados] = useState([]);
  const [albunsExibidos, setAlbunsExibidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [albumSelecionado, setAlbumSelecionado] = useState(null);
  const [filtroNota, setFiltroNota] = useState({ min: 0, max: 10 });
  const [termoPesquisa, setTermoPesquisa] = useState("");
  const [ordenacao, setOrdenacao] = useState("padrao"); // "padrao", "crescente", "decrescente"
  const [erro, setErro] = useState(null);
  const [autenticado, setAutenticado] = useState(isAuthenticated());
  const [tentativasErro, setTentativasErro] = useState(0);
  const [progressoCarregamento, setProgressoCarregamento] = useState(0);
  const [carregamentoProgressivo, setCarregamentoProgressivo] = useState(true);

  // Verificar autenticação e carregar dados iniciais
  useEffect(() => {
    const verificarAuth = async () => {
      try {
        if (!isAuthenticated()) {
          setAutenticado(false);
          setErro("Sessão expirada. Faça login novamente.");
          setCarregando(false);
        } else {
          setAutenticado(true);
        }
      } catch (error) {
        console.error("Erro ao verificar autenticação:", error);
        setCarregando(false);
      }
    };

    verificarAuth();

    // Pré-carregar o cache de álbuns para acelerar a visualização inicial
    carregarCacheAlbuns();
  }, []);

  /**
   * Aplica filtros e ordenação aos álbuns avaliados
   */
  const aplicarFiltrosEOrdenacao = () => {
    if (!albunsAvaliados || albunsAvaliados.length === 0) {
      setAlbunsExibidos([]);
      return;
    }

    let albumsFiltrados = [...albunsAvaliados];

    // Aplicar filtro por nota
    albumsFiltrados = albumsFiltrados.filter((album) => {
      const nota = parseFloat(album.mediaAvaliacao);
      return nota >= filtroNota.min && nota <= filtroNota.max;
    });

    // Aplicar filtro de pesquisa por texto (nome do álbum ou artista)
    if (termoPesquisa.trim() !== "") {
      const termo = termoPesquisa.toLowerCase().trim();
      albumsFiltrados = albumsFiltrados.filter((album) => {
        const nomeAlbum = album.name.toLowerCase();
        const artistas = album.artists
          .map((a) => a.name.toLowerCase())
          .join(" ");
        return nomeAlbum.includes(termo) || artistas.includes(termo);
      });
    }

    // Aplicar ordenação
    if (ordenacao === "padrao") {
      // Ordenar por data mais recente primeiro
      albumsFiltrados.sort((a, b) => {
        const dataA = a.ultimaAtualizacao || 0;
        const dataB = b.ultimaAtualizacao || 0;
        return dataB - dataA;
      });
    } else if (ordenacao === "crescente") {
      albumsFiltrados.sort(
        (a, b) => parseFloat(a.mediaAvaliacao) - parseFloat(b.mediaAvaliacao)
      );
    } else if (ordenacao === "decrescente") {
      albumsFiltrados.sort(
        (a, b) => parseFloat(b.mediaAvaliacao) - parseFloat(a.mediaAvaliacao)
      );
    }

    setAlbunsExibidos(albumsFiltrados);
  };

  /**
   * Alterna o modo de ordenação
   */
  const alternarOrdenacao = () => {
    if (ordenacao === "padrao") {
      setOrdenacao("crescente");
    } else if (ordenacao === "crescente") {
      setOrdenacao("decrescente");
    } else {
      setOrdenacao("padrao");
    }
  };

  /**
   * Tenta novamente carregar os álbuns após um erro
   */
  const tentarNovamente = async () => {
    setErro(null);
    setTentativasErro(0);

    // Verificar autenticação primeiro
    if (!isAuthenticated()) {
      const recuperado = await recuperarAutenticacao();
      if (!recuperado) {
        setErro("Falha na autenticação. Tente fazer login novamente.");
        return;
      }
      setAutenticado(true);
    }

    carregarAlbunsAvaliados();
  };

  /**
   * Delay para evitar chamadas de API muito frequentes
   * @param {number} ms - Tempo de espera em milissegundos
   * @returns {Promise<void>}
   */
  const aguardar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /**
   * Callback chamado quando um álbum é carregado no modo progressivo
   * @param {Object} album - Detalhes do álbum carregado
   * @param {number} atual - Número de álbuns processados até agora
   * @param {number} total - Total de álbuns a serem processados
   */
  const onAlbumCarregado = (album, atual, total) => {
    if (!album || album.erro) return;

    // Garantir que o álbum tenha um progressoAvaliacao válido
    if (!album.progressoAvaliacao) {
      album.progressoAvaliacao = { avaliadas: 0, total: 0, percentual: 0 };
    }

    // Garantir que o álbum tenha um array de artistas
    if (!album.artists) {
      album.artists = [{ name: "Artista desconhecido" }];
    }

    // Verificar se o álbum foi recentemente avaliado usando as datas de avaliação
    const datasAvaliacoes = JSON.parse(
      localStorage.getItem("datasAvaliacoes") || "{}"
    );
    if (datasAvaliacoes[album.id] && datasAvaliacoes[album.id].ultima) {
      // Usar a data da última avaliação como timestamp
      album.ultimaAtualizacao = new Date(
        datasAvaliacoes[album.id].ultima
      ).getTime();
    } else {
      // Se não tem data da última avaliação ou é o álbum selecionado, usar timestamp atual
      album.ultimaAtualizacao =
        album.id === albumSelecionado
          ? Date.now()
          : album.ultimaAtualizacao || 0;
    }

    // Atualizar o progresso de carregamento
    const percentual = Math.floor((atual / total) * 100);
    setProgressoCarregamento(percentual);

    // Adicionar o álbum à lista atual, se ainda não estiver lá
    setAlbunsAvaliados((albuns) => {
      // Verificar se o álbum já está na lista
      if (albuns.find((a) => a.id === album.id)) {
        return albuns;
      }

      // Adicionar o novo álbum e retornar a lista atualizada
      const novosAlbuns = [...albuns, album];

      // Ordenar para que os álbuns mais recentes fiquem primeiro
      const albunsOrdenados = novosAlbuns.sort((a, b) => {
        return (b.ultimaAtualizacao || 0) - (a.ultimaAtualizacao || 0);
      });

      // Também atualizar albunsExibidos para mostrar imediatamente
      aplicarFiltrosEOrdenacaoProgressivos(albunsOrdenados);

      return albunsOrdenados;
    });
  };

  /**
   * Versão de aplicarFiltrosEOrdenacao que trabalha com um conjunto específico de álbuns
   * @param {Array} albuns - Lista de álbuns para filtrar e ordenar
   */
  const aplicarFiltrosEOrdenacaoProgressivos = (albuns) => {
    if (!albuns || albuns.length === 0) {
      setAlbunsExibidos([]);
      return;
    }

    let albumsFiltrados = [...albuns];

    // Aplicar filtro por nota
    albumsFiltrados = albumsFiltrados.filter((album) => {
      const nota = parseFloat(album.mediaAvaliacao);
      return nota >= filtroNota.min && nota <= filtroNota.max;
    });

    // Aplicar filtro de pesquisa por texto
    if (termoPesquisa.trim() !== "") {
      const termo = termoPesquisa.toLowerCase().trim();
      albumsFiltrados = albumsFiltrados.filter((album) => {
        const nomeAlbum = album.name.toLowerCase();
        const artistas = album.artists
          .map((a) => a.name.toLowerCase())
          .join(" ");
        return nomeAlbum.includes(termo) || artistas.includes(termo);
      });
    }

    // Aplicar ordenação
    if (ordenacao === "padrao") {
      // Ordenar por data mais recente primeiro
      albumsFiltrados.sort((a, b) => {
        const dataA = a.ultimaAtualizacao || 0;
        const dataB = b.ultimaAtualizacao || 0;
        return dataB - dataA;
      });
    } else if (ordenacao === "crescente") {
      albumsFiltrados.sort(
        (a, b) => parseFloat(a.mediaAvaliacao) - parseFloat(b.mediaAvaliacao)
      );
    } else if (ordenacao === "decrescente") {
      albumsFiltrados.sort(
        (a, b) => parseFloat(b.mediaAvaliacao) - parseFloat(a.mediaAvaliacao)
      );
    }

    setAlbunsExibidos(albumsFiltrados);
  };

  /**
   * Carrega os álbuns avaliados do serviço de armazenamento
   * @returns {Promise<void>}
   */
  const carregarAlbunsAvaliados = async () => {
    setCarregando(true);
    setErro(null);

    try {
      const usuarioFirebase = getUsuarioAtual();

      // Se o usuário estiver usando o Firebase, buscar álbuns dele
      if (usuarioFirebase) {
        try {
          const albumsDoFirebase = await obterAlbunsAvaliados();

          // Transformar os dados para o formato esperado pela interface
          const albumsProcessados = albumsDoFirebase.map((album) => {
            let ultimaAtualizacao = album.data_atualizacao?.toDate
              ? album.data_atualizacao.toDate().getTime()
              : album.data_atualizacao || Date.now();

            // Calcular o número de faixas avaliadas
            const faixasAvaliadas = Object.values(album.avaliacoes).filter(
              (avaliacao) => avaliacao > 0
            ).length;

            // Tentar obter o total real de faixas
            let totalFaixas = 0;
            if (album.faixas && Array.isArray(album.faixas)) {
              totalFaixas = album.faixas.length;
            } else if (
              album.faixas &&
              album.faixas.items &&
              Array.isArray(album.faixas.items)
            ) {
              totalFaixas = album.faixas.items.length;
            } else {
              totalFaixas = Object.keys(album.avaliacoes).length;
            }

            return {
              id: album.id,
              name: album.nome || "Álbum Desconhecido",
              artists: [{ name: album.artista }],
              images: [{ url: album.imagem }],
              mediaAvaliacao:
                album.mediaAvaliacao !== undefined
                  ? album.mediaAvaliacao
                  : calcularMediaDoObjeto(album.avaliacoes),
              progressoAvaliacao: {
                avaliadas: faixasAvaliadas,
                total: totalFaixas,
                percentual:
                  totalFaixas > 0
                    ? Math.round((faixasAvaliadas / totalFaixas) * 100)
                    : 0,
              },
              ultimaAtualizacao,
            };
          });

          // Também carregar os dados mais atualizados para evitar a necessidade
          // para manter consistência com outros componentes
          const dadosFirebase = await carregarAvaliacoesSincronizadas();
          if (dadosFirebase) {
            setAvaliacoesFaixas(dadosFirebase.avaliacoesFaixas);
            setMapaFaixasAlbuns(dadosFirebase.mapaFaixasAlbuns);
          }

          // Ordenar os álbuns para que os mais recentes apareçam primeiro
          const albumsOrdenados = [...albumsProcessados].sort(
            (a, b) => (b.ultimaAtualizacao || 0) - (a.ultimaAtualizacao || 0)
          );

          setAlbunsAvaliados(albumsOrdenados);
          setAlbunsExibidos(albumsOrdenados);
          setCarregando(false);
          return;
        } catch (error) {
          console.error("Erro ao carregar álbuns do Firebase:", error);
          setErro("Erro ao carregar álbuns do Firebase. Tente novamente.");
          setCarregando(false);
          return;
        }
      } else {
        // Se não estiver usando Firebase, usar dados em memória
        // Se não temos o mapa de faixas para álbuns, não podemos mostrar os álbuns
        if (Object.keys(getMapaFaixasAlbuns()).length === 0) {
          setAlbunsAvaliados([]);
          setAlbunsExibidos([]);
          setCarregando(false);
          return;
        }

        // Obter IDs de álbuns únicos
        const idsAlbuns = obterAlbunsUnicos();
        console.log(
          `Encontrados ${idsAlbuns.length} álbuns únicos para buscar`
        );

        if (idsAlbuns.length === 0) {
          console.log("Nenhum álbum único encontrado");
          setAlbunsAvaliados([]);
          setAlbunsExibidos([]);
          setCarregando(false);
          return;
        }

        // Decidir se usa carregamento progressivo
        if (carregamentoProgressivo) {
          try {
            console.log("Iniciando carregamento progressivo");
            // No modo progressivo, definimos carregando como false mais cedo
            // para permitir que a interface mostre os álbuns à medida que são carregados
            setCarregando(false);

            // Chamar a função com o callback de progresso
            console.log(
              `Buscando detalhes para ${idsAlbuns.length} álbuns de forma progressiva`
            );
            const resultados = await buscarDetalhesAlbunsEmLote(
              idsAlbuns,
              (atual, total) => {
                const porcentagem = Math.floor((atual / total) * 100);
                setProgressoCarregamento(porcentagem);
                console.log(`Progresso do carregamento: ${porcentagem}%`);
              },
              onAlbumCarregado
            );

            // Tratar resultados para remover álbuns com erro
            const albumsValidos = resultados.filter((album) => !album.erro);

            // Garantir que temos a lista completa no final
            console.log(
              `Carregamento concluído: ${albumsValidos.length} álbuns válidos de ${resultados.length} total`
            );
            setAlbunsAvaliados(albumsValidos);
            aplicarFiltrosEOrdenacao();

            // Resetar progresso
            setProgressoCarregamento(100);

            // Pequeno delay e então esconder o indicador de progresso
            await aguardar(300);
            setProgressoCarregamento(0);
          } catch (erro) {
            console.error("Erro no carregamento progressivo:", erro);
            setErro("Erro ao carregar álbuns. Tente novamente.");
            setProgressoCarregamento(0);
            setAlbunsAvaliados([]);
            setAlbunsExibidos([]);
          }
        } else {
          // Modo tradicional (não progressivo)
          try {
            console.log("Iniciando carregamento tradicional (não progressivo)");
            const resultados = await buscarDetalhesAlbunsEmLote(idsAlbuns);

            // Filtrar álbuns com erro, se houver muitos erros mostrar mensagem
            const albumsComErro = resultados.filter((album) => album.erro);
            if (
              albumsComErro.length === resultados.length &&
              resultados.length > 0
            ) {
              // Todos os álbuns falharam
              let mensagemErro =
                "Não foi possível carregar nenhum dos álbuns avaliados.";

              // Se houve um erro 429, indicar que é limite de requisições
              if (tentativasErro >= 2) {
                mensagemErro =
                  "Você atingiu o limite de requisições da API do Spotify. Tente novamente em alguns minutos.";
              } else {
                setTentativasErro(tentativasErro + 1);
              }

              setErro(mensagemErro);
              setAlbunsAvaliados([]);
              setAlbunsExibidos([]);
            } else {
              // Filtrar álbuns sem erro
              const albumsValidos = resultados.filter((album) => !album.erro);

              // Garantir que todos os álbuns tenham os campos necessários
              const albumsProcessados = albumsValidos.map((album) => {
                if (!album.progressoAvaliacao) {
                  album.progressoAvaliacao = {
                    avaliadas: 0,
                    total: 0,
                    percentual: 0,
                  };
                }
                if (!album.artists) {
                  album.artists = [{ name: "Artista desconhecido" }];
                }
                if (album.mediaAvaliacao === undefined) {
                  album.mediaAvaliacao = 0;
                }
                return album;
              });

              setAlbunsAvaliados(albumsProcessados);
              // Aplicar filtros iniciais
              setAlbunsExibidos(albumsProcessados);
              // Resetar contador de tentativas de erro
              setTentativasErro(0);
            }
          } catch (erro) {
            console.error("Erro no carregamento tradicional:", erro);
            setErro("Erro ao carregar álbuns. Tente novamente.");
            setAlbunsAvaliados([]);
            setAlbunsExibidos([]);
          } finally {
            // No final do modo tradicional, definir carregando como false
            setCarregando(false);
          }
        }
      }
    } catch (erro) {
      console.error("Erro ao carregar álbuns avaliados:", erro);

      let mensagemErro =
        "Ocorreu um erro ao tentar carregar seus álbuns avaliados.";

      // Verificar se é um erro de limite de taxa (429)
      if (erro.message && erro.message.includes("429")) {
        mensagemErro =
          "Limite de requisições ao Spotify atingido. Tente novamente em alguns minutos.";
        setTentativasErro(tentativasErro + 1);
      }

      setErro(mensagemErro);
      setAlbunsAvaliados([]);
      setAlbunsExibidos([]);
      setCarregando(false);
    }
  };

  /**
   * Calcula a média do objeto de avaliações
   * @param {Object} avaliacoes - Objeto com avaliações
   * @returns {number} Média das avaliações
   */
  const calcularMediaDoObjeto = (avaliacoes) => {
    if (!avaliacoes || Object.keys(avaliacoes).length === 0) return 0;

    // Total de faixas no álbum
    const totalFaixas = Object.keys(avaliacoes).length;

    // Soma de todas as avaliações (mesmo que sejam zero)
    const soma = Object.values(avaliacoes).reduce((acc, val) => acc + val, 0);

    // Divide pelo total de faixas, incluindo as não avaliadas
    // Converter para escala 0-10 e formatar com uma casa decimal
    return parseFloat(((soma / totalFaixas) * 2).toFixed(1));
  };

  /**
   * Recarrega a lista de álbuns avaliados
   * @returns {Promise<void>}
   */
  const recarregarListaAlbuns = async () => {
    try {
      console.log("Recarregando lista de álbuns...");
      setCarregando(true);
      setErro(null);

      // Verificar se o usuário está autenticado
      if (!isAuthenticated()) {
        console.log("Usuário não está autenticado para recarregar álbuns");
        setErro("Para ver seus álbuns, faça login primeiro.");
        setCarregando(false);
        return;
      }

      const usuarioFirebase = getUsuarioAtual();

      // Se tiver usuário Firebase, buscar álbuns do Firebase
      if (usuarioFirebase) {
        console.log("Recarregando álbuns do Firebase");
        carregarAlbunsAvaliados();
      }
    } catch (error) {
      console.error("Erro ao recarregar lista de álbuns:", error);
      setErro("Falha ao carregar álbuns. Tente novamente mais tarde.");
      setCarregando(false);
    }
  };

  // Efeito para carregar os álbuns iniciais quando o componente é montado
  useEffect(() => {
    const inicializar = async () => {
      // Verificar se há um usuário logado antes de tentar carregar álbuns
      if (isAuthenticated()) {
        setAutenticado(true);
        await carregarAlbunsAvaliados();
      } else {
        setAutenticado(false);
        setErro("Para ver seus álbuns, faça login primeiro.");
        setCarregando(false);
      }
    };

    inicializar();
  }, []);

  // Efeito para aplicar filtros quando há mudanças
  useEffect(() => {
    aplicarFiltrosEOrdenacao();
  }, [albunsAvaliados, filtroNota, termoPesquisa, ordenacao]);

  // Efeito para aplicar o termo de pesquisa inicial, se fornecido
  useEffect(() => {
    if (termoPesquisaInicial) {
      setTermoPesquisa(termoPesquisaInicial);
    }
  }, [termoPesquisaInicial]);

  // Monitorar mudanças na autenticação
  useEffect(() => {
    const handleAutenticacaoAlterada = () => {
      const autenticadoAtual = isAuthenticated();
      if (autenticadoAtual !== autenticado) {
        setAutenticado(autenticadoAtual);

        if (autenticadoAtual) {
          // Se o usuário acabou de fazer login, recarregar álbuns
          carregarAlbunsAvaliados();
        } else {
          // Se o usuário fez logout, limpar dados
          setAlbunsAvaliados([]);
          setAlbunsExibidos([]);
          setErro("Faça login para ver seus álbuns avaliados.");
        }
      }
    };

    // Configurar listener para mudanças de autenticação
    window.addEventListener("authStateChanged", handleAutenticacaoAlterada);

    // Limpar listener ao desmontar
    return () => {
      window.removeEventListener(
        "authStateChanged",
        handleAutenticacaoAlterada
      );
    };
  }, [autenticado]);

  // Monitorar mudanças nas avaliações
  useEffect(() => {
    const handleAvaliacoesAlteradas = () => {
      // Recarregar dados apenas se estiver autenticado
      if (isAuthenticated()) {
        recarregarListaAlbuns();
      }
    };

    // Configurar listener para mudanças de avaliações
    window.addEventListener("avaliacoes_alteradas", handleAvaliacoesAlteradas);

    // Limpar listener ao desmontar
    return () => {
      window.removeEventListener(
        "avaliacoes_alteradas",
        handleAvaliacoesAlteradas
      );
    };
  }, []);

  return {
    albunsAvaliados,
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
    setErro,
    carregarAlbunsAvaliados,
    recarregarListaAlbuns,
    tentarNovamente,
    autenticado,
    progressoCarregamento,
    carregamentoProgressivo,
    setCarregamentoProgressivo,
    setProgressoCarregamento,
  };
}
