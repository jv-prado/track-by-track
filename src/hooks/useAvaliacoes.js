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
        // Verificar se existe um usuário de demonstração
        const demoToken = localStorage.getItem("demo_token");
        const demoExpiry = localStorage.getItem("demo_token_expiry");
        const modoDemo =
          demoToken && demoExpiry && parseInt(demoExpiry) > Date.now();

        if (modoDemo) {
          // Usuário de demonstração válido
          setAutenticado(true);
          setCarregando(false);
          console.log("Usuário de demonstração detectado e válido");
          // Carregar dados do localStorage para o modo de demonstração
          carregarDadosLocalStorage();
        } else if (!isAuthenticated()) {
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

    // Aplicar ordenação personalizada apenas se ordenação for "padrao"
    if (ordenacao === "padrao") {
      // Ordenar por recentes (mais recentes primeiro)
      albumsFiltrados.sort((a, b) => {
        return (b.ultimaAtualizacao || 0) - (a.ultimaAtualizacao || 0);
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
      // Sempre ordenar com os mais recentes primeiro
      albumsFiltrados.sort(
        (a, b) => (b.ultimaAtualizacao || 0) - (a.ultimaAtualizacao || 0)
      );
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
   * Carrega os álbuns avaliados pelo usuário
   */
  const carregarAlbunsAvaliados = async () => {
    setCarregando(true);
    setErro(null);
    setProgressoCarregamento(0);
    setAlbunsAvaliados([]);
    setAlbunsExibidos([]);

    try {
      // Verificar se é modo de demonstração
      const demoToken = localStorage.getItem("demo_token");
      const demoExpiry = localStorage.getItem("demo_token_expiry");
      const modoDemo =
        demoToken && demoExpiry && parseInt(demoExpiry) > Date.now();

      // Verificar autenticação normal
      const autenticadoNormal = isAuthenticated();

      if (!modoDemo && !autenticadoNormal) {
        setErro("Sessão expirada. Faça login novamente.");
        setCarregando(false);
        setAutenticado(false);
        return;
      }

      // Verificar se o usuário está usando o Firebase e não está em modo demo
      const usuarioFirebase = getUsuarioAtual();

      if (usuarioFirebase && !modoDemo) {
        // Se estiver usando o Firebase, carregar diretamente do Firebase
        try {
          // Buscar dados do Firebase
          const albunsFirebase = await obterAlbunsAvaliados();

          if (!albunsFirebase || albunsFirebase.length === 0) {
            setAlbunsAvaliados([]);
            setAlbunsExibidos([]);
            setCarregando(false);
            return;
          }

          // Processar os álbuns do Firebase
          const albumsProcessados = albunsFirebase.map((album) => ({
            id: album.id,
            name: album.nome,
            artists: [{ name: album.artista }],
            images: [{ url: album.imagem }],
            mediaAvaliacao: calcularMediaDoObjeto(album.avaliacoes),
            progressoAvaliacao: {
              total: Object.keys(album.avaliacoes).length,
              avaliadas: Object.values(album.avaliacoes).filter((a) => a > 0)
                .length,
              percentual: Math.round(
                (Object.values(album.avaliacoes).filter((a) => a > 0).length /
                  Object.keys(album.avaliacoes).length) *
                  100
              ),
            },
            dataAvaliacao: new Date(
              album.data_avaliacao?.toDate
                ? album.data_avaliacao.toDate()
                : album.data_avaliacao
            ),
            // Adicionar timestamp para ordenação por álbum mais recente
            ultimaAtualizacao: album.data_avaliacao?.seconds
              ? album.data_avaliacao.seconds * 1000
              : Date.now(),
          }));

          // Também atualizar o estado em memória a partir do Firebase
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
        // Se estiver em modo demo ou não estiver usando Firebase, usar dados em memória
        const avaliacoesFaixas = getAvaliacoesFaixas();
        const mapaFaixasAlbuns = getMapaFaixasAlbuns();

        console.log("Modo de carregamento:", modoDemo ? "Demo" : "Normal");
        console.log("Mapa de faixas para álbuns:", mapaFaixasAlbuns);
        console.log("Avaliações de faixas:", avaliacoesFaixas);

        // Forçar carregamento dos dados do localStorage no modo demo
        if (modoDemo) {
          // Verificar se o flag de modo demo está ativo
          if (localStorage.getItem("modo_demo_ativo") !== "true") {
            localStorage.setItem("modo_demo_ativo", "true");
          }

          // Forçar carregamento dos dados do localStorage
          carregarDadosLocalStorage();
        }

        // Se não temos o mapa de faixas para álbuns, não podemos mostrar os álbuns
        if (Object.keys(mapaFaixasAlbuns).length === 0) {
          console.log("Nenhum álbum para mostrar - mapa vazio");
          setAlbunsAvaliados([]);
          setAlbunsExibidos([]);
          setCarregando(false);
          return;
        }

        // Obter IDs de álbuns únicos
        const idsAlbuns = obterAlbunsUnicos();

        if (idsAlbuns.length === 0) {
          console.log("Nenhum álbum para mostrar - nenhum ID único");
          setAlbunsAvaliados([]);
          setAlbunsExibidos([]);
          setCarregando(false);
          return;
        }

        // Decidir se usa carregamento progressivo
        if (carregamentoProgressivo) {
          try {
            // No modo progressivo, definimos carregando como false mais cedo
            // para permitir que a interface mostre os álbuns à medida que são carregados
            setCarregando(false);

            // Se estiver em modo demo e não tiver álbuns avaliados, apenas encerrar sem erro
            if (modoDemo && idsAlbuns.length === 0) {
              console.log(
                "Modo demo sem álbuns avaliados - exibindo interface vazia"
              );
              setAlbunsAvaliados([]);
              setAlbunsExibidos([]);
              setProgressoCarregamento(0);
              return;
            }

            // Chamar a função com o callback de progresso
            const resultados = await buscarDetalhesAlbunsEmLote(
              idsAlbuns,
              (atual, total) => {
                setProgressoCarregamento(Math.floor((atual / total) * 100));
              },
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
          } catch (erro) {
            console.error("Erro no carregamento progressivo:", erro);
            setErro("Erro ao carregar álbuns. Tente novamente.");
            setProgressoCarregamento(0);
            // Se estiver em modo demo, apenas inicializar com lista vazia em vez de mostrar erro
            if (modoDemo) {
              setAlbunsAvaliados([]);
              setAlbunsExibidos([]);
              setErro(null);
            }
          }
        } else {
          // Modo tradicional (não progressivo)
          try {
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

              // Se estiver em modo demo, não mostrar erro
              if (!modoDemo) {
                setErro(mensagemErro);
              }

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
            // Se estiver em modo demo, não mostrar erro
            if (!modoDemo) {
              setErro("Erro ao carregar álbuns. Tente novamente.");
            }
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
   * Recarrega a lista de álbuns, atualizando suas avaliações
   */
  const recarregarListaAlbuns = async () => {
    console.log("Recarregando lista de álbuns...");

    // Verificar se estamos em modo de demonstração
    const demoToken = localStorage.getItem("demo_token");
    const demoExpiry = localStorage.getItem("demo_token_expiry");
    const modoDemo =
      demoToken && demoExpiry && parseInt(demoExpiry) > Date.now();

    // Verificar autenticação
    if (!isAuthenticated() && !modoDemo) {
      setErro("Sessão expirada. Faça login novamente.");
      setCarregando(false);
      setAutenticado(false);
      return;
    }

    try {
      // Verificar se o usuário está usando o Firebase
      const usuarioFirebase = getUsuarioAtual();

      if (usuarioFirebase && !modoDemo) {
        // Recarregar diretamente do Firebase
        carregarAlbunsAvaliados();
        return;
      }

      // Se estiver em modo demo, recarregar dados do localStorage
      if (modoDemo) {
        // Recarregar dados do localStorage para garantir que temos os mais atualizados
        setAvaliacoesFaixas(
          JSON.parse(localStorage.getItem("avaliacoesFaixas") || "{}")
        );
        setMapaFaixasAlbuns(
          JSON.parse(localStorage.getItem("mapaFaixasAlbuns") || "{}")
        );

        // Obter informações sobre datas de avaliação
        const datasAvaliacoes = JSON.parse(
          localStorage.getItem("datasAvaliacoes") || "{}"
        );

        // Para uma mudança visual imediata, recarregar completamente
        carregarAlbunsAvaliados();
        return;
      }

      // Se não estiver usando Firebase, usar dados em memória
      const avaliacoesFaixas = getAvaliacoesFaixas();
      const mapaFaixasAlbuns = getMapaFaixasAlbuns();

      if (Object.keys(mapaFaixasAlbuns).length === 0) {
        return;
      }

      // Recalcular médias e progressos de avaliações para álbuns existentes
      const albunsAtualizados = await Promise.all(
        albunsAvaliados.map(async (album) => {
          if (album.erro) {
            // Tentar novamente para álbuns que falharam anteriormente
            return await buscarDetalhesAlbumSeguro(album.id);
          }

          try {
            // Obter faixas do álbum para calcular progresso
            const faixas = await buscarFaixasPorAlbum(album.id);

            // Apenas recalcular médias
            return {
              ...album,
              mediaAvaliacao: calcularMediaAlbum(
                album.id,
                faixas,
                avaliacoesFaixas
              ),
              progressoAvaliacao: calcularProgressoAvaliacao(
                faixas,
                avaliacoesFaixas
              ),
              // Adicionar a data atual como última atualização para ordenação
              ultimaAtualizacao:
                album.id === albumSelecionado
                  ? Date.now()
                  : album.ultimaAtualizacao || 0,
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

      // Ordenar a lista para que os álbuns recentemente avaliados apareçam primeiro
      const albunsOrdenados = [...albunsAtualizados].sort((a, b) => {
        return (b.ultimaAtualizacao || 0) - (a.ultimaAtualizacao || 0);
      });

      setAlbunsAvaliados(albunsOrdenados);
      aplicarFiltrosEOrdenacao();
    } catch (erro) {
      console.error("Erro ao recarregar lista de álbuns:", erro);
    }
  };

  // Carregar álbuns quando o hook é iniciado
  useEffect(() => {
    // Verificar se estamos em modo de demonstração e carregar dados
    const demoToken = localStorage.getItem("demo_token");
    const demoExpiry = localStorage.getItem("demo_token_expiry");
    const modoDemo =
      demoToken && demoExpiry && parseInt(demoExpiry) > Date.now();

    if (modoDemo) {
      console.log("Modo demo - carregando dados do localStorage primeiro");
      carregarDadosLocalStorage();

      // Verificar e atualizar as datas de avaliação no localStorage se necessário
      const datasAvaliacoes = JSON.parse(
        localStorage.getItem("datasAvaliacoes") || "{}"
      );
      let precisaAtualizar = false;

      // Verificar se todos os álbuns têm data de avaliação
      const mapaFaixasAlbuns = JSON.parse(
        localStorage.getItem("mapaFaixasAlbuns") || "{}"
      );
      const idsAlbuns = Array.from(new Set(Object.values(mapaFaixasAlbuns)));

      idsAlbuns.forEach((albumId) => {
        if (!datasAvaliacoes[albumId]) {
          // Criar entrada para álbuns sem data registrada
          datasAvaliacoes[albumId] = {
            primeira: new Date().toISOString(),
            ultima: new Date().toISOString(),
          };
          precisaAtualizar = true;
        }
      });

      if (precisaAtualizar) {
        localStorage.setItem(
          "datasAvaliacoes",
          JSON.stringify(datasAvaliacoes)
        );
      }
    }

    // Após carregar do localStorage, carregar álbuns avaliados
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

  // Adicionar um event listener para recarregar os álbuns quando as avaliações forem alteradas
  useEffect(() => {
    // Função para lidar com o evento de avaliações alteradas
    const handleAvaliacoesAlteradas = () => {
      console.log(
        "Evento de avaliações alteradas detectado no hook useAvaliacoes"
      );
      // Verificar se o usuário saiu do modo demo
      const demoToken = localStorage.getItem("demo_token");
      const demoExpiry = localStorage.getItem("demo_token_expiry");
      const modoDemo =
        demoToken && demoExpiry && parseInt(demoExpiry) > Date.now();

      if (!modoDemo && !isAuthenticated()) {
        // Se não está mais em modo demo ou autenticado, não fazer nada
        return;
      }

      // Recarregar a lista de álbuns avaliados
      recarregarListaAlbuns();
    };

    // Adicionar o event listener
    window.addEventListener("avaliacoes_alteradas", handleAvaliacoesAlteradas);

    // Remover o event listener quando o componente for desmontado
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
    tentarNovamente,
    recarregarListaAlbuns,
    carregarAlbunsAvaliados,
    progressoCarregamento,
    carregamentoProgressivo,
    setCarregamentoProgressivo,
  };
}
