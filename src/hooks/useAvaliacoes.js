import { useState, useEffect } from "react";
import {
  obterAlbunsUnicos,
  calcularMediaAlbum,
  calcularProgressoAvaliacao,
  buscarDetalhesAlbumSeguro,
  buscarDetalhesAlbunsEmLote,
  carregarCacheAlbuns,
} from "../services/avaliacoes";
import { buscarFaixasPorAlbum } from "../services/spotify";
import { isAuthenticated, recuperarAutenticacao } from "../services/auth";

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

  // Verificar autenticação
  useEffect(() => {
    const verificarAuth = async () => {
      if (!isAuthenticated()) {
        setAutenticado(false);
        setErro("Sessão expirada. Faça login novamente.");
        setCarregando(false);
      } else {
        setAutenticado(true);
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
    if (ordenacao === "crescente") {
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

      // Também atualizar albunsExibidos para mostrar imediatamente
      aplicarFiltrosEOrdenacaoProgressivos(novosAlbuns);

      return novosAlbuns;
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
    if (ordenacao === "crescente") {
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
   * Carrega os álbuns avaliados pelo usuário
   */
  const carregarAlbunsAvaliados = async () => {
    setCarregando(true);
    setErro(null);
    setProgressoCarregamento(0);
    setAlbunsAvaliados([]);
    setAlbunsExibidos([]);

    // Verificar autenticação
    if (!isAuthenticated()) {
      setErro("Sessão expirada. Faça login novamente.");
      setCarregando(false);
      setAutenticado(false);
      return;
    }

    try {
      // Carregar avaliações salvas
      const avaliacoesSalvas = JSON.parse(
        localStorage.getItem("avaliacoesFaixas") || "{}"
      );
      const mapaFaixasAlbuns = JSON.parse(
        localStorage.getItem("mapaFaixasAlbuns") || "{}"
      );

      // Se não temos o mapa de faixas para álbuns, não podemos mostrar os álbuns
      if (Object.keys(mapaFaixasAlbuns).length === 0) {
        setAlbunsAvaliados([]);
        setAlbunsExibidos([]);
        setCarregando(false);
        return;
      }

      // Obter IDs de álbuns únicos
      const idsAlbuns = obterAlbunsUnicos(avaliacoesSalvas);

      if (idsAlbuns.length === 0) {
        setAlbunsAvaliados([]);
        setAlbunsExibidos([]);
        setCarregando(false);
        return;
      }

      // Buscar detalhes dos álbuns em lote para evitar limitações de taxa
      console.log(
        `Buscando detalhes de ${idsAlbuns.length} álbuns avaliados...`
      );

      if (carregamentoProgressivo) {
        // No modo progressivo, definimos carregando como false mais cedo
        // para permitir que a interface mostre os álbuns à medida que são carregados
        setCarregando(false);

        // Chamar a função com o callback de progresso
        const resultados = await buscarDetalhesAlbunsEmLote(
          idsAlbuns,
          avaliacoesSalvas,
          mapaFaixasAlbuns,
          onAlbumCarregado
        );

        // Tratar resultados para remover álbuns com erro
        const albumsValidos = resultados.filter((album) => !album.erro);

        // Garantir que temos a lista completa no final
        setAlbunsAvaliados(albumsValidos);
        aplicarFiltrosEOrdenacao();

        // Resetar progresso
        setProgressoCarregamento(100);

        // Pequeno delay e então esconder o indicador de progresso
        await aguardar(300);
        setProgressoCarregamento(0);
      } else {
        // Modo tradicional (não progressivo)
        const resultados = await buscarDetalhesAlbunsEmLote(
          idsAlbuns,
          avaliacoesSalvas,
          mapaFaixasAlbuns
        );

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
          setAlbunsAvaliados(albumsValidos);
          // Aplicar filtros iniciais
          setAlbunsExibidos(albumsValidos);
          // Resetar contador de tentativas de erro
          setTentativasErro(0);
        }

        // No final do modo tradicional, definir carregando como false
        setCarregando(false);
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
   * Recarrega a lista de álbuns, atualizando suas avaliações
   */
  const recarregarListaAlbuns = async () => {
    // Verificar autenticação
    if (!isAuthenticated()) {
      setErro("Sessão expirada. Faça login novamente.");
      setCarregando(false);
      setAutenticado(false);
      return;
    }

    try {
      // Carregar avaliações salvas
      const avaliacoesSalvas = JSON.parse(
        localStorage.getItem("avaliacoesFaixas") || "{}"
      );
      const mapaFaixasAlbuns = JSON.parse(
        localStorage.getItem("mapaFaixasAlbuns") || "{}"
      );

      if (Object.keys(mapaFaixasAlbuns).length === 0) {
        return;
      }

      // Recalcular médias e progressos de avaliações para álbuns existentes
      const albunsAtualizados = await Promise.all(
        albunsAvaliados.map(async (album) => {
          if (album.erro) {
            // Tentar novamente para álbuns que falharam anteriormente
            return await buscarDetalhesAlbumSeguro(
              album.id,
              avaliacoesSalvas,
              mapaFaixasAlbuns
            );
          }

          try {
            // Apenas recalcular médias sem fazer novas requisições à API
            return {
              ...album,
              mediaAvaliacao: calcularMediaAlbum(
                album.id,
                avaliacoesSalvas,
                mapaFaixasAlbuns
              ),
              progressoAvaliacao: {
                ...album.progressoAvaliacao,
                avaliadas: calcularProgressoAvaliacao(
                  album.id,
                  avaliacoesSalvas,
                  mapaFaixasAlbuns,
                  album.progressoAvaliacao.total
                ).avaliadas,
              },
            };
          } catch (erro) {
            console.warn(
              `Não foi possível atualizar as informações do álbum ${album.id}:`,
              erro
            );
            // Manter as informações existentes se não conseguir atualizar
            return album;
          }
        })
      );

      setAlbunsAvaliados(albunsAtualizados);
      aplicarFiltrosEOrdenacao();
    } catch (erro) {
      console.error("Erro ao recarregar lista de álbuns:", erro);
    }
  };

  // Carregar álbuns quando o hook é iniciado
  useEffect(() => {
    carregarAlbunsAvaliados();
  }, []);

  // Atualizar lista exibida quando filtros ou álbuns mudam
  useEffect(() => {
    aplicarFiltrosEOrdenacao();
  }, [filtroNota, termoPesquisa, ordenacao, albunsAvaliados]);

  // Atualizar termo de pesquisa quando props mudam
  useEffect(() => {
    if (termoPesquisaInicial) {
      setTermoPesquisa(termoPesquisaInicial);
    }
  }, [termoPesquisaInicial]);

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
    tentarNovamente,
    recarregarListaAlbuns,
    carregarAlbunsAvaliados,
    progressoCarregamento,
    carregamentoProgressivo,
    setCarregamentoProgressivo,
  };
}
