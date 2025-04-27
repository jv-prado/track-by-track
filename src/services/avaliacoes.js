/**
 * Serviço para gerenciar avaliações de álbuns e faixas
 */
import { buscarDetalhesAlbum } from "./spotify";

// Cache em memória para álbuns (substitui localStorage)
const cacheAlbuns = {};

// Armazenamento em memória para avaliações (substitui localStorage)
const memoriaAvaliacoes = {
  avaliacoesFaixas: {},
  mapaFaixasAlbuns: {},
  datasAvaliacoes: {},
  preferenciasAlbuns: {},
};

/**
 * Registra a data da avaliação para uma faixa
 * @param {string} faixaId - ID da faixa
 * @param {number} avaliacao - Nota da avaliação (0-5)
 */
export const registrarDataAvaliacao = (faixaId, avaliacao) => {
  try {
    // Obter o mapa de faixas para álbuns
    const mapaFaixasAlbuns = memoriaAvaliacoes.mapaFaixasAlbuns;

    // Se não tiver informação sobre o álbum desta faixa, não fazer nada
    if (!mapaFaixasAlbuns[faixaId]) return;

    const albumId = mapaFaixasAlbuns[faixaId];
    const agora = new Date();

    // Obter o registro de datas de avaliação ou criar um novo
    const datasAvaliacoes = memoriaAvaliacoes.datasAvaliacoes;

    // Se não existir registro para este álbum, criar novo
    if (!datasAvaliacoes[albumId]) {
      datasAvaliacoes[albumId] = {
        primeira: agora.toISOString(),
        ultima: agora.toISOString(),
      };
    } else {
      // Atualizar apenas a data da última avaliação
      datasAvaliacoes[albumId].ultima = agora.toISOString();
    }
  } catch (erro) {
    console.warn("Erro ao registrar data de avaliação:", erro);
  }
};

/**
 * Obtém as datas de primeira e última avaliação para um álbum
 * @param {string} albumId - ID do álbum
 * @returns {Object} Objeto com as datas de primeira e última avaliação
 */
export const obterDatasAvaliacao = (albumId) => {
  try {
    const datasAvaliacoes = memoriaAvaliacoes.datasAvaliacoes;

    if (!datasAvaliacoes[albumId]) {
      return {
        primeira: null,
        ultima: null,
        temRegistro: false,
      };
    }

    return {
      primeira: new Date(datasAvaliacoes[albumId].primeira),
      ultima: new Date(datasAvaliacoes[albumId].ultima),
      temRegistro: true,
    };
  } catch (erro) {
    console.warn("Erro ao obter datas de avaliação:", erro);
    return {
      primeira: null,
      ultima: null,
      temRegistro: false,
    };
  }
};

/**
 * Formata uma data para exibição
 * @param {Date} data - Data a ser formatada
 * @returns {string} Data formatada
 */
export const formatarData = (data) => {
  if (!data) return "";

  try {
    // Formatar a data para o locale pt-BR
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(data);
  } catch (erro) {
    console.warn("Erro ao formatar data:", erro);
    return data.toLocaleString();
  }
};

// Variável para controlar se a migração já foi executada
let migracaoExecutada = false;

/**
 * Migra dados de avaliações antigas para incluir datas de avaliação
 * Este processo só precisa ser executado uma vez por sessão
 */
export const migrarDadosAvaliacoes = () => {
  // Se já foi executada, não fazer nada
  if (migracaoExecutada) return;
  migracaoExecutada = true;

  console.log("Iniciando migração de dados de avaliações...");

  try {
    // Registrar datas atuais para todos os álbuns avaliados
    const agora = new Date();
    const albumsUnicos = obterAlbunsUnicos();

    albumsUnicos.forEach((albumId) => {
      // Se não tiver registro de data para este álbum, criar um novo
      if (!memoriaAvaliacoes.datasAvaliacoes[albumId]) {
        memoriaAvaliacoes.datasAvaliacoes[albumId] = {
          primeira: agora.toISOString(),
          ultima: agora.toISOString(),
        };
      }
    });

    console.log(`Migração concluída para ${albumsUnicos.length} álbuns.`);
  } catch (erro) {
    console.error("Erro durante a migração de dados:", erro);
  }
};

/**
 * Gerencia o cache de álbuns para melhorar o desempenho
 * @param {string} idAlbum - ID do álbum
 * @param {Object} detalhes - Detalhes do álbum para salvar no cache
 * @returns {Object} Detalhes do álbum (do cache ou fornecidos)
 */
export const gerenciarCacheAlbum = (idAlbum, detalhes = null) => {
  // Se forneceu novos detalhes, atualizar o cache
  if (detalhes) {
    cacheAlbuns[idAlbum] = {
      ...detalhes,
      timestamp: Date.now(),
    };
  }

  // Retornar os detalhes do cache, se disponíveis
  return cacheAlbuns[idAlbum];
};

/**
 * Carrega o cache de álbuns
 */
export const carregarCacheAlbuns = () => {
  // Função mantida por compatibilidade, mas não faz nada sem localStorage
  console.log("Cache de álbuns em memória está vazio.");
};

/**
 * Obtém álbuns únicos a partir do mapa de faixas para álbuns
 * @returns {string[]} Array com IDs únicos de álbuns
 */
export const obterAlbunsUnicos = () => {
  try {
    const mapaFaixasAlbuns = memoriaAvaliacoes.mapaFaixasAlbuns;
    const idsUnicos = [...new Set(Object.values(mapaFaixasAlbuns))];
    return idsUnicos;
  } catch (erro) {
    console.error("Erro ao obter álbuns únicos:", erro);
    return [];
  }
};

/**
 * Calcula o progresso da avaliação de um álbum
 * @param {Object} faixas - Objeto com as faixas do álbum
 * @param {Object} avaliacoes - Objeto com as avaliações das faixas
 * @returns {Object} Progresso da avaliação
 */
export const calcularProgressoAvaliacao = (faixas, avaliacoes) => {
  if (!faixas || !faixas.items || faixas.items.length === 0) {
    return { avaliadas: 0, total: 0, percentual: 0 };
  }

  const total = faixas.items.length;
  let avaliadas = 0;

  faixas.items.forEach((faixa) => {
    if (avaliacoes[faixa.id] && avaliacoes[faixa.id] > 0) {
      avaliadas++;
    }
  });

  const percentual = Math.round((avaliadas / total) * 100);

  return { avaliadas, total, percentual };
};

/**
 * Calcula a média das avaliações de um álbum
 * @param {string} albumId - ID do álbum
 * @param {Object} faixas - Dados das faixas do álbum
 * @param {Object} avaliacoes - Avaliações das faixas
 * @returns {number} Média das avaliações
 */
export const calcularMediaAlbum = (albumId, faixas, avaliacoes) => {
  if (!faixas || !faixas.items || faixas.items.length === 0) {
    return 0;
  }

  let soma = 0;

  // Percorrer todas as faixas e somar suas avaliações
  faixas.items.forEach((faixa) => {
    const avaliacao = avaliacoes[faixa.id] || 0;
    soma += avaliacao;
  });

  // Dividir pela quantidade total de faixas
  const total = faixas.items.length;

  // Converter para escala 0-10 e formatar com uma casa decimal
  return parseFloat(((soma / total) * 2).toFixed(1));
};

/**
 * Busca detalhes de um álbum de forma segura, verificando o cache primeiro
 * @param {string} albumId - ID do álbum
 * @returns {Promise<Object>} Detalhes do álbum
 */
export const buscarDetalhesAlbumSeguro = async (albumId) => {
  try {
    // Verificar se temos no cache
    const albumCached = cacheAlbuns[albumId];
    if (albumCached) {
      // Verificar se o cache é "fresco" (menos de 7 dias)
      const agora = Date.now();
      const cacheTempo = albumCached.timestamp || 0;
      const diffDias = (agora - cacheTempo) / (1000 * 60 * 60 * 24);

      if (diffDias < 7) {
        return albumCached;
      }
    }

    // Se não está no cache ou está desatualizado, buscar da API
    const detalhes = await buscarDetalhesAlbum(albumId);

    // Salvar no cache
    gerenciarCacheAlbum(albumId, detalhes);

    return detalhes;
  } catch (erro) {
    console.error(`Erro ao buscar detalhes do álbum ${albumId}:`, erro);

    // Se tiver no cache, retorna mesmo estando desatualizado
    if (cacheAlbuns[albumId]) {
      console.log(`Usando dados em cache para ${albumId} após erro na API`);
      return cacheAlbuns[albumId];
    }

    // Se não tiver no cache, propaga o erro
    throw erro;
  }
};

/**
 * Busca detalhes de vários álbuns em lote, com progresso
 * @param {string[]} idsAlbuns - IDs dos álbuns
 * @param {Function} onProgresso - Callback para atualizar progresso
 * @param {Function} onAlbumCarregado - Callback quando um álbum for carregado
 * @returns {Promise<Object[]>} Array com detalhes dos álbuns
 */
export const buscarDetalhesAlbunsEmLote = async (
  idsAlbuns,
  onProgresso = () => {},
  onAlbumCarregado = () => {}
) => {
  if (!idsAlbuns || idsAlbuns.length === 0) {
    return [];
  }

  try {
    const resultados = [];
    let processados = 0;
    const total = idsAlbuns.length;

    // Processa os álbuns em lotes para evitar sobrecarregar a API
    const TAMANHO_LOTE = 8; // Processa 8 álbuns por vez
    const TEMPO_ENTRE_LOTES = 500; // Espera 500ms entre os lotes

    // Função para processar um lote de álbuns
    const processarLote = async (inicio) => {
      const idsFatiados = idsAlbuns.slice(
        inicio,
        Math.min(inicio + TAMANHO_LOTE, total)
      );

      // Carregar lote
      const promessas = idsFatiados.map(async (albumId, indexLote) => {
        try {
          // Buscar detalhes do álbum
          const detalhes = await buscarDetalhesAlbumSeguro(albumId);

          // Calcular média de avaliação
          const mediaAvaliacao = calcularMediaEmMemoria(albumId);

          // Criar objeto de resultado
          const albumDetalhado = {
            ...detalhes,
            mediaAvaliacao,
          };

          // Garantir que o álbum tenha todas as propriedades necessárias
          if (
            !albumDetalhado.artists ||
            !Array.isArray(albumDetalhado.artists) ||
            albumDetalhado.artists.length === 0
          ) {
            albumDetalhado.artists = [{ name: "Artista desconhecido" }];
          }

          if (
            !albumDetalhado.images ||
            !Array.isArray(albumDetalhado.images) ||
            albumDetalhado.images.length === 0
          ) {
            albumDetalhado.images = [{ url: null }];
          }

          // Calcular progresso de avaliação
          const avaliacoesFaixas = memoriaAvaliacoes.avaliacoesFaixas;
          const mapaFaixasAlbuns = memoriaAvaliacoes.mapaFaixasAlbuns;

          // Encontrar faixas deste álbum
          const faixasDoAlbum = Object.entries(mapaFaixasAlbuns)
            .filter(([faixaId, idAlbum]) => idAlbum === albumId)
            .map(([faixaId]) => faixaId);

          // Total de faixas no álbum
          const totalFaixas = faixasDoAlbum.length;

          // Faixas avaliadas (com nota > 0)
          const faixasAvaliadas = faixasDoAlbum.filter(
            (faixaId) =>
              avaliacoesFaixas[faixaId] && avaliacoesFaixas[faixaId] > 0
          ).length;

          // Percentual de avaliação
          const percentual =
            totalFaixas > 0
              ? Math.round((faixasAvaliadas / totalFaixas) * 100)
              : 0;

          // Adicionar informações de progresso
          albumDetalhado.progressoAvaliacao = {
            avaliadas: faixasAvaliadas,
            total: totalFaixas,
            percentual: percentual,
          };

          // Notificar que um álbum foi carregado
          onAlbumCarregado(albumDetalhado, processados + indexLote + 1, total);

          return albumDetalhado;
        } catch (erro) {
          console.error(`Erro ao processar álbum ${albumId}:`, erro);

          // Criar um objeto de álbum com erro, mas com os campos mínimos necessários
          const albumComErro = {
            id: albumId,
            erro: true,
            mediaAvaliacao: 0,
            name: "Álbum indisponível",
            artists: [{ name: "Artista desconhecido" }],
            images: [{ url: null }],
            progressoAvaliacao: { avaliadas: 0, total: 0, percentual: 0 },
          };

          // Notificar que um álbum falhou, mas continuar processando
          onAlbumCarregado(albumComErro, processados + indexLote + 1, total);

          return albumComErro;
        }
      });

      const resultadosLote = await Promise.all(promessas);
      resultados.push(...resultadosLote);

      // Atualizar progresso
      processados += idsFatiados.length;
      onProgresso(processados, total);

      // Se ainda não terminou, processar próximo lote
      if (processados < total) {
        await new Promise((resolve) => setTimeout(resolve, TEMPO_ENTRE_LOTES));
        return processarLote(processados);
      }

      return resultados;
    };

    // Iniciar processamento
    onProgresso(0, total);
    return await processarLote(0);
  } catch (erro) {
    console.error("Erro ao buscar detalhes dos álbuns em lote:", erro);
    throw erro;
  }
};

/**
 * Calcula a média das avaliações de um álbum usando dados em memória
 * @param {string} albumId - ID do álbum
 * @returns {number} Média das avaliações (0-10)
 */
const calcularMediaEmMemoria = (albumId) => {
  try {
    const avaliacoesFaixas = memoriaAvaliacoes.avaliacoesFaixas;
    const mapaFaixasAlbuns = memoriaAvaliacoes.mapaFaixasAlbuns;

    // Encontrar faixas deste álbum
    const faixasDoAlbum = Object.entries(mapaFaixasAlbuns)
      .filter(([faixaId, idAlbum]) => idAlbum === albumId)
      .map(([faixaId]) => faixaId);

    if (faixasDoAlbum.length === 0) return 0;

    // Calcular média considerando todas as faixas
    let soma = 0;

    // Somar avaliações de todas as faixas
    faixasDoAlbum.forEach((faixaId) => {
      const avaliacao = avaliacoesFaixas[faixaId] || 0;
      soma += avaliacao;
    });

    // Dividir pela quantidade total de faixas, incluindo as não avaliadas
    return parseFloat(((soma / faixasDoAlbum.length) * 2).toFixed(1));
  } catch (erro) {
    console.error(`Erro ao calcular média para álbum ${albumId}:`, erro);
    return 0;
  }
};

/**
 * Obtém as avaliações das faixas
 * @returns {Object} Objeto com as avaliações
 */
export const getAvaliacoesFaixas = () => {
  return memoriaAvaliacoes.avaliacoesFaixas;
};

/**
 * Configura uma verificação periódica para manter os dados sincronizados
 * entre localStorage e memória no modo de demonstração
 */
export const configurarSincronizacaoAutomatica = () => {
  // Executar a sincronização inicial
  carregarDadosLocalStorage();

  // Configurar um intervalo para verificar regularmente
  const intervalo = setInterval(() => {
    const demoToken = localStorage.getItem("demo_token");
    const demoExpiry = localStorage.getItem("demo_token_expiry");
    const modoDemo =
      demoToken && demoExpiry && parseInt(demoExpiry) > Date.now();

    if (modoDemo) {
      console.log("Executando sincronização automática (modo demo)");
      carregarDadosLocalStorage(); // Carregar do localStorage para a memória
      salvarDadosLocalStorage(); // Salvar da memória para o localStorage
    } else {
      // Se não estiver mais em modo demo, limpar o intervalo
      clearInterval(intervalo);
      console.log("Sincronização automática encerrada (modo demo desativado)");
    }
  }, 5000); // Verificar a cada 5 segundos

  return intervalo;
};

/**
 * Carrega dados do localStorage para a memória
 * Esta função deve ser chamada no início da aplicação
 */
export const carregarDadosLocalStorage = () => {
  try {
    console.log("Verificando dados no localStorage para modo de demonstração");

    // Verificar se estamos em modo de demonstração
    const demoToken = localStorage.getItem("demo_token");
    const demoExpiry = localStorage.getItem("demo_token_expiry");
    const modoDemo =
      demoToken && demoExpiry && parseInt(demoExpiry) > Date.now();

    if (!modoDemo) {
      console.log(
        "Usuário não está em modo de demonstração, ignorando localStorage"
      );
      return;
    }

    console.log("Modo de demonstração ativo, carregando dados do localStorage");

    // Inicializar estruturas vazias por padrão para evitar objetos nulos
    memoriaAvaliacoes.avaliacoesFaixas = {};
    memoriaAvaliacoes.mapaFaixasAlbuns = {};
    memoriaAvaliacoes.datasAvaliacoes = {};
    memoriaAvaliacoes.preferenciasAlbuns = {};

    // Carregar avaliações das faixas
    const avaliacoesString = localStorage.getItem("avaliacoesFaixas");
    if (avaliacoesString) {
      try {
        const dados = JSON.parse(avaliacoesString);
        if (dados && typeof dados === "object") {
          memoriaAvaliacoes.avaliacoesFaixas = dados;
          console.log(
            "Carregadas avaliações de faixas do localStorage",
            Object.keys(dados).length,
            "avaliações"
          );
        }
      } catch (e) {
        console.error("Erro ao analisar avaliacoesFaixas:", e);
        localStorage.setItem("avaliacoesFaixas", JSON.stringify({}));
      }
    } else {
      localStorage.setItem("avaliacoesFaixas", JSON.stringify({}));
    }

    // Carregar mapa de faixas para álbuns
    const mapaString = localStorage.getItem("mapaFaixasAlbuns");
    if (mapaString) {
      try {
        const dados = JSON.parse(mapaString);
        if (dados && typeof dados === "object") {
          memoriaAvaliacoes.mapaFaixasAlbuns = dados;
          console.log(
            "Carregado mapa de faixas-álbuns do localStorage",
            Object.keys(dados).length,
            "mapeamentos"
          );
        }
      } catch (e) {
        console.error("Erro ao analisar mapaFaixasAlbuns:", e);
        localStorage.setItem("mapaFaixasAlbuns", JSON.stringify({}));
      }
    } else {
      localStorage.setItem("mapaFaixasAlbuns", JSON.stringify({}));
    }

    // Carregar datas de avaliações
    const datasString = localStorage.getItem("datasAvaliacoes");
    if (datasString) {
      try {
        const dados = JSON.parse(datasString);
        if (dados && typeof dados === "object") {
          memoriaAvaliacoes.datasAvaliacoes = dados;
          console.log("Carregadas datas de avaliações do localStorage");
        }
      } catch (e) {
        console.error("Erro ao analisar datasAvaliacoes:", e);
        localStorage.setItem("datasAvaliacoes", JSON.stringify({}));
      }
    } else {
      localStorage.setItem("datasAvaliacoes", JSON.stringify({}));
    }

    // Carregar preferências de álbuns
    const prefsString = localStorage.getItem("preferenciasAlbuns");
    if (prefsString) {
      try {
        const dados = JSON.parse(prefsString);
        if (dados && typeof dados === "object") {
          memoriaAvaliacoes.preferenciasAlbuns = dados;
          console.log("Carregadas preferências de álbuns do localStorage");
        }
      } catch (e) {
        console.error("Erro ao analisar preferenciasAlbuns:", e);
        localStorage.setItem("preferenciasAlbuns", JSON.stringify({}));
      }
    } else {
      localStorage.setItem("preferenciasAlbuns", JSON.stringify({}));
    }

    console.log("Resumo dos dados carregados:");
    console.log(
      "- Avaliações de faixas:",
      Object.keys(memoriaAvaliacoes.avaliacoesFaixas).length
    );
    console.log(
      "- Mapa faixas-álbuns:",
      Object.keys(memoriaAvaliacoes.mapaFaixasAlbuns).length
    );
    console.log(
      "- Datas de avaliações:",
      Object.keys(memoriaAvaliacoes.datasAvaliacoes).length
    );
    console.log(
      "- Preferências de álbuns:",
      Object.keys(memoriaAvaliacoes.preferenciasAlbuns).length
    );
  } catch (erro) {
    console.error("Erro ao carregar dados do localStorage:", erro);
    // Inicializar com objetos vazios em caso de erro
    memoriaAvaliacoes.avaliacoesFaixas = {};
    memoriaAvaliacoes.mapaFaixasAlbuns = {};
    memoriaAvaliacoes.datasAvaliacoes = {};
    memoriaAvaliacoes.preferenciasAlbuns = {};
  }
};

/**
 * Salva dados da memória para o localStorage
 * Esta função deve ser chamada após cada alteração nos dados
 */
export const salvarDadosLocalStorage = () => {
  try {
    // Verificar se estamos em modo de demonstração
    const demoToken = localStorage.getItem("demo_token");
    if (!demoToken) {
      return; // Não salvar no localStorage se não estiver em modo de demonstração
    }

    // Salvar avaliações das faixas
    localStorage.setItem(
      "avaliacoesFaixas",
      JSON.stringify(memoriaAvaliacoes.avaliacoesFaixas)
    );

    // Salvar mapa de faixas para álbuns
    localStorage.setItem(
      "mapaFaixasAlbuns",
      JSON.stringify(memoriaAvaliacoes.mapaFaixasAlbuns)
    );

    // Salvar datas de avaliações
    localStorage.setItem(
      "datasAvaliacoes",
      JSON.stringify(memoriaAvaliacoes.datasAvaliacoes)
    );

    // Salvar preferências de álbuns
    localStorage.setItem(
      "preferenciasAlbuns",
      JSON.stringify(memoriaAvaliacoes.preferenciasAlbuns)
    );
  } catch (erro) {
    console.error("Erro ao salvar dados no localStorage:", erro);
  }
};

/**
 * Define as avaliações das faixas
 * @param {Object} avaliacoes - Avaliações das faixas
 */
export const setAvaliacoesFaixas = (avaliacoes) => {
  memoriaAvaliacoes.avaliacoesFaixas = avaliacoes;
  salvarDadosLocalStorage(); // Salvar no localStorage após alteração
};

/**
 * Obtém o mapa de faixas para álbuns
 * @returns {Object} Mapa de faixas para álbuns
 */
export const getMapaFaixasAlbuns = () => {
  return memoriaAvaliacoes.mapaFaixasAlbuns;
};

/**
 * Define o mapa de faixas para álbuns
 * @param {Object} mapa - Mapa de faixas para álbuns
 */
export const setMapaFaixasAlbuns = (mapa) => {
  memoriaAvaliacoes.mapaFaixasAlbuns = mapa;
  salvarDadosLocalStorage(); // Salvar no localStorage após alteração
};

/**
 * Recarrega as avaliações de álbuns e faixas
 * Esta função deve ser chamada quando precisamos garantir
 * que temos os dados mais atualizados (por exemplo, após uma avaliação)
 * @returns {Object} Objeto com avaliacoesFaixas e mapaFaixasAlbuns atualizados
 */
export const recarregarAvaliacoes = () => {
  // Verificar se estamos em modo de demonstração
  const demoToken = localStorage.getItem("demo_token");
  const demoExpiry = localStorage.getItem("demo_token_expiry");
  const modoDemo = demoToken && demoExpiry && parseInt(demoExpiry) > Date.now();

  if (modoDemo) {
    // Recarregar dados do localStorage
    carregarDadosLocalStorage();
  }

  // Retornar os dados atualizados
  return {
    avaliacoesFaixas: memoriaAvaliacoes.avaliacoesFaixas,
    mapaFaixasAlbuns: memoriaAvaliacoes.mapaFaixasAlbuns,
    preferenciasAlbuns: memoriaAvaliacoes.preferenciasAlbuns,
    datasAvaliacoes: memoriaAvaliacoes.datasAvaliacoes,
  };
};
