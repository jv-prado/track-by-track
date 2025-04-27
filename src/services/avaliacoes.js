/**
 * Services relacionados às avaliações de álbuns e faixas
 */
import { buscarDetalhesAlbum, buscarFaixasPorAlbum } from "./spotify";

// Cache para armazenar detalhes de álbuns já buscados
const cacheAlbuns = {};

/**
 * Obtém os IDs de álbuns únicos a partir das avaliações de faixas
 * @param {Object} avaliacoesFaixas - Objeto contendo as avaliações das faixas
 * @returns {Array} Array de IDs de álbuns únicos
 */
export const obterAlbunsUnicos = (avaliacoesFaixas) => {
  // Mapear IDs de faixas para IDs de álbuns
  const mapaDeFaixas = JSON.parse(
    localStorage.getItem("mapaFaixasAlbuns") || "{}"
  );
  const idsAlbunsAvaliados = new Set();

  // Coletar IDs de álbuns únicos que têm faixas avaliadas
  Object.entries(avaliacoesFaixas).forEach(([idFaixa, avaliacao]) => {
    if (avaliacao > 0 && mapaDeFaixas[idFaixa]) {
      idsAlbunsAvaliados.add(mapaDeFaixas[idFaixa]);
    }
  });

  return Array.from(idsAlbunsAvaliados);
};

/**
 * Registra a data da avaliação para uma faixa
 * @param {string} faixaId - ID da faixa
 * @param {number} avaliacao - Nota da avaliação (0-5)
 */
export const registrarDataAvaliacao = (faixaId, avaliacao) => {
  try {
    // Obter o mapa de faixas para álbuns
    const mapaFaixasAlbuns = JSON.parse(
      localStorage.getItem("mapaFaixasAlbuns") || "{}"
    );

    // Se não tiver informação sobre o álbum desta faixa, não fazer nada
    if (!mapaFaixasAlbuns[faixaId]) return;

    const albumId = mapaFaixasAlbuns[faixaId];
    const agora = new Date();

    // Obter o registro de datas de avaliação ou criar um novo
    const datasAvaliacoes = JSON.parse(
      localStorage.getItem("datas_avaliacoes") || "{}"
    );

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

    // Salvar de volta no localStorage
    localStorage.setItem("datas_avaliacoes", JSON.stringify(datasAvaliacoes));
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
    const datasAvaliacoes = JSON.parse(
      localStorage.getItem("datas_avaliacoes") || "{}"
    );

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
 * @param {Date} data - Objeto Date
 * @returns {string} Data formatada (DD/MM/YYYY)
 */
export const formatarData = (data) => {
  if (!data) return "Não disponível";

  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

/**
 * Calcula a média das avaliações para um álbum
 * @param {string} idAlbum - ID do álbum
 * @param {Object} avaliacoesFaixas - Objeto contendo as avaliações das faixas
 * @param {Object} mapaFaixasAlbuns - Objeto mapeando faixas para álbuns
 * @returns {string} Média das avaliações em escala de 0-10 (com 1 casa decimal)
 */
export const calcularMediaAlbum = (
  idAlbum,
  avaliacoesFaixas,
  mapaFaixasAlbuns
) => {
  const faixasDoAlbum = Object.entries(mapaFaixasAlbuns)
    .filter(([, albumId]) => albumId === idAlbum)
    .map(([faixaId]) => faixaId);

  if (faixasDoAlbum.length === 0) return "0.0";

  const somaAvaliacoes = faixasDoAlbum.reduce((soma, faixaId) => {
    return soma + (avaliacoesFaixas[faixaId] || 0);
  }, 0);

  // Média em escala de 0-5
  const media = somaAvaliacoes / faixasDoAlbum.length;
  // Convertendo para escala de 0-10 (arredondando para 1 casa decimal)
  return (media * 2).toFixed(1);
};

/**
 * Calcula o progresso das avaliações para um álbum
 * @param {string} idAlbum - ID do álbum
 * @param {Object} avaliacoesFaixas - Objeto contendo as avaliações das faixas
 * @param {Object} mapaFaixasAlbuns - Objeto mapeando faixas para álbuns
 * @param {number} totalFaixas - Total de faixas no álbum
 * @returns {Object} Objeto com informações de progresso (avaliadas, total, percentual)
 */
export const calcularProgressoAvaliacao = (
  idAlbum,
  avaliacoesFaixas,
  mapaFaixasAlbuns,
  totalFaixas
) => {
  const faixasDoAlbum = Object.entries(mapaFaixasAlbuns)
    .filter(([, albumId]) => albumId === idAlbum)
    .map(([faixaId]) => faixaId);

  if (faixasDoAlbum.length === 0 || !totalFaixas)
    return { avaliadas: 0, total: 0, percentual: 0 };

  const avaliadas = faixasDoAlbum.reduce((count, faixaId) => {
    return (
      count +
      (avaliacoesFaixas[faixaId] && avaliacoesFaixas[faixaId] > 0 ? 1 : 0)
    );
  }, 0);

  const total = totalFaixas || faixasDoAlbum.length;
  const percentual = Math.round((avaliadas / total) * 100);

  return { avaliadas, total, percentual };
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

    // Salvar os dados mais importantes do cache no localStorage também
    try {
      const cacheLocal = JSON.parse(
        localStorage.getItem("cache_albuns") || "{}"
      );
      cacheLocal[idAlbum] = {
        id: detalhes.id,
        name: detalhes.name,
        artists: detalhes.artists,
        images: detalhes.images,
        timestamp: Date.now(),
      };
      localStorage.setItem("cache_albuns", JSON.stringify(cacheLocal));
    } catch (err) {
      console.warn("Não foi possível salvar o cache no localStorage:", err);
    }
  }

  // Retornar os detalhes do cache, se disponíveis
  return cacheAlbuns[idAlbum];
};

/**
 * Carrega o cache de álbuns do localStorage, se disponível
 */
export const carregarCacheAlbuns = () => {
  try {
    const cacheLocal = JSON.parse(localStorage.getItem("cache_albuns") || "{}");

    // Mesclar com o cache em memória
    Object.keys(cacheLocal).forEach((idAlbum) => {
      if (!cacheAlbuns[idAlbum]) {
        cacheAlbuns[idAlbum] = cacheLocal[idAlbum];
      }
    });

    console.log(
      `Cache de álbuns carregado com ${Object.keys(cacheAlbuns).length} itens.`
    );
  } catch (err) {
    console.warn("Erro ao carregar cache de álbuns:", err);
  }
};

/**
 * Adiciona um atraso entre chamadas de API para evitar limitações de taxa
 * @param {number} ms Tempo em milissegundos para aguardar
 * @returns {Promise<void>} Promessa resolvida após o atraso
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Busca detalhes de múltiplos álbuns em lote com controle de taxa
 * @param {Array<string>} idsAlbuns - Array de IDs de álbuns
 * @param {Object} avaliacoesSalvas - Avaliações salvas
 * @param {Object} mapaFaixasAlbuns - Mapeamento de faixas para álbuns
 * @param {Function} onProgress - Callback chamado a cada álbum carregado
 * @returns {Promise<Array<Object>>} Array de objetos com detalhes de álbuns
 */
export const buscarDetalhesAlbunsEmLote = async (
  idsAlbuns,
  avaliacoesSalvas,
  mapaFaixasAlbuns,
  onProgress = null
) => {
  const resultados = [];
  let albumsProcessados = 0;

  // Carregar cache de álbuns se necessário
  if (Object.keys(cacheAlbuns).length === 0) {
    carregarCacheAlbuns();
  }

  // Processar em lotes maiores para melhorar desempenho
  const tamanhoLote = 8; // Aumentado de 3 para 8
  const tempoEspera = 500; // Reduzido de 1000ms para 500ms

  for (let i = 0; i < idsAlbuns.length; i += tamanhoLote) {
    const loteAtual = idsAlbuns.slice(i, i + tamanhoLote);

    // Processar o lote atual
    const promessasLote = loteAtual.map((idAlbum) =>
      buscarDetalhesAlbumSeguro(idAlbum, avaliacoesSalvas, mapaFaixasAlbuns)
    );

    // Para cada álbum que terminar, notificar o progresso
    if (onProgress) {
      promessasLote.forEach(async (promessa) => {
        const album = await promessa;
        albumsProcessados++;
        onProgress(album, albumsProcessados, idsAlbuns.length);
      });
    }

    const resultadosLote = await Promise.all(promessasLote);
    resultados.push(...resultadosLote);

    // Se não for o último lote, adicionar um atraso para evitar limites de taxa
    if (i + tamanhoLote < idsAlbuns.length) {
      console.log(`Aguardando antes de processar o próximo lote de álbuns...`);
      await delay(tempoEspera);
    }
  }

  return resultados;
};

/**
 * Busca detalhes de um álbum com tratamento de erros
 * @param {string} idAlbum - ID do álbum
 * @param {Object} avaliacoesSalvas - Avaliações salvas
 * @param {Object} mapaFaixasAlbuns - Mapeamento de faixas para álbuns
 * @returns {Promise<Object>} Objeto com detalhes do álbum e suas avaliações
 */
export const buscarDetalhesAlbumSeguro = async (
  idAlbum,
  avaliacoesSalvas,
  mapaFaixasAlbuns
) => {
  try {
    // Verificar cache primeiro
    const albumCache = gerenciarCacheAlbum(idAlbum);
    if (albumCache) {
      // Verificar se o cache não está expirado (7 dias)
      const agora = Date.now();
      const tempoExpiracaoMs = 7 * 24 * 60 * 60 * 1000; // 7 dias

      if (
        albumCache.timestamp &&
        agora - albumCache.timestamp < tempoExpiracaoMs
      ) {
        console.log(`Usando dados em cache para o álbum ${idAlbum}`);

        // Recalcular apenas média e progresso (dados dinâmicos)
        const mediaAvaliacao = calcularMediaAlbum(
          idAlbum,
          avaliacoesSalvas,
          mapaFaixasAlbuns
        );

        const progressoAvaliacao = calcularProgressoAvaliacao(
          idAlbum,
          avaliacoesSalvas,
          mapaFaixasAlbuns,
          albumCache.totalFaixas || 0
        );

        return {
          ...albumCache,
          mediaAvaliacao,
          progressoAvaliacao,
        };
      }
    }

    // Buscar detalhes do álbum
    const detalhesAlbum = await buscarDetalhesAlbum(idAlbum);

    if (!detalhesAlbum || !detalhesAlbum.id) {
      throw new Error("Detalhes do álbum não encontrados");
    }

    let totalFaixas = 0;
    let faixasAlbum = null;

    try {
      // Tentar buscar faixas, mas prosseguir mesmo que falhe
      faixasAlbum = await buscarFaixasPorAlbum(idAlbum);
      totalFaixas =
        faixasAlbum && faixasAlbum.items ? faixasAlbum.items.length : 0;
    } catch (erroFaixas) {
      console.warn(
        `Não foi possível carregar faixas do álbum ${idAlbum}:`,
        erroFaixas
      );
      // Calcular total de faixas com base no mapeamento local
      const faixasDoAlbumLocal = Object.entries(mapaFaixasAlbuns)
        .filter(([, albumId]) => albumId === idAlbum)
        .map(([faixaId]) => faixaId);
      totalFaixas = faixasDoAlbumLocal.length;
    }

    // Calcular média e progresso
    const mediaAvaliacao = calcularMediaAlbum(
      idAlbum,
      avaliacoesSalvas,
      mapaFaixasAlbuns
    );

    const progressoAvaliacao = calcularProgressoAvaliacao(
      idAlbum,
      avaliacoesSalvas,
      mapaFaixasAlbuns,
      totalFaixas
    );

    // Preparar o resultado e salvar no cache
    const resultado = {
      ...detalhesAlbum,
      totalFaixas,
      mediaAvaliacao,
      progressoAvaliacao,
    };

    // Atualizar o cache
    gerenciarCacheAlbum(idAlbum, resultado);

    return resultado;
  } catch (error) {
    console.error(`Falha ao carregar detalhes do álbum ${idAlbum}:`, error);
    // Retornar um objeto com informações mínimas para não quebrar a interface
    return {
      id: idAlbum,
      name: "Álbum indisponível",
      artists: [{ name: "Informações não disponíveis" }],
      images: [],
      erro: true,
      mediaAvaliacao: calcularMediaAlbum(
        idAlbum,
        avaliacoesSalvas,
        mapaFaixasAlbuns
      ),
      progressoAvaliacao: { avaliadas: 0, total: 0, percentual: 0 },
    };
  }
};

/**
 * Migra dados de avaliações antigas para incluir datas de avaliação
 * Deve ser chamado uma vez durante a inicialização do aplicativo
 */
export const migrarDadosAvaliacoes = () => {
  try {
    // Verificar se a migração já foi feita
    const migracaoFeita = localStorage.getItem("migracao_datas_avaliacoes");
    if (migracaoFeita === "true") {
      return; // Migração já foi realizada
    }

    // Obter avaliações existentes
    const avaliacoesFaixas = JSON.parse(
      localStorage.getItem("avaliacoesFaixas") || "{}"
    );

    // Obter mapeamento de faixas para álbuns
    const mapaFaixasAlbuns = JSON.parse(
      localStorage.getItem("mapaFaixasAlbuns") || "{}"
    );

    // Se não houver avaliações ou mapeamento, não é necessário migrar
    if (
      Object.keys(avaliacoesFaixas).length === 0 ||
      Object.keys(mapaFaixasAlbuns).length === 0
    ) {
      localStorage.setItem("migracao_datas_avaliacoes", "true");
      return;
    }

    // Obter ou criar registro de datas
    const datasAvaliacoes = JSON.parse(
      localStorage.getItem("datas_avaliacoes") || "{}"
    );

    // Obter IDs de álbuns únicos com avaliações
    const albunsAvaliados = new Set();
    Object.entries(avaliacoesFaixas).forEach(([faixaId, avaliacao]) => {
      if (avaliacao > 0 && mapaFaixasAlbuns[faixaId]) {
        albunsAvaliados.add(mapaFaixasAlbuns[faixaId]);
      }
    });

    // Data para álbuns sem registro (usaremos a data atual)
    const agora = new Date();
    const dataString = agora.toISOString();

    // Adicionar datas para álbuns sem registro
    Array.from(albunsAvaliados).forEach((albumId) => {
      if (!datasAvaliacoes[albumId]) {
        datasAvaliacoes[albumId] = {
          primeira: dataString,
          ultima: dataString,
        };
      }
    });

    // Salvar dados migrados
    localStorage.setItem("datas_avaliacoes", JSON.stringify(datasAvaliacoes));

    // Marcar migração como concluída
    localStorage.setItem("migracao_datas_avaliacoes", "true");

    console.log(
      `Migração de datas de avaliação concluída para ${albunsAvaliados.size} álbuns.`
    );
  } catch (erro) {
    console.error("Erro ao migrar datas de avaliação:", erro);
  }
};
