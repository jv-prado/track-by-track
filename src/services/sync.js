/**
 * Serviço para sincronizar dados com o Firebase
 */
import {
  obterAlbunsAvaliados,
  salvarAvaliacaoAlbum,
  getUsuarioAtual,
} from "./firebase";
import { buscarDetalhesAlbum } from "./spotify";

/**
 * Sincroniza dados do usuário com o serviço de banco de dados
 */
export const sincronizarAvaliacoes = async () => {
  try {
    // Verificar se o usuário está logado no Firebase
    const usuarioFirebase = getUsuarioAtual();

    // Apenas continuamos se o usuário estiver autenticado no Firebase
    if (usuarioFirebase) {
      await carregarDoFirebase();
      return true;
    }

    return false;
  } catch (error) {
    console.error("Erro ao sincronizar avaliações:", error);
    return false;
  }
};

/**
 * Sincroniza avaliações com o Firebase
 * @param {Object} avaliacoesFaixas - Avaliações de faixas
 * @param {Object} mapaFaixasAlbuns - Mapa de faixas para álbuns
 */
export const sincronizarComFirebase = async (
  avaliacoesFaixas,
  mapaFaixasAlbuns
) => {
  try {
    // Obter conjunto de IDs de álbuns únicos das faixas avaliadas
    const idsAlbuns = new Set();

    Object.entries(avaliacoesFaixas).forEach(([idFaixa, avaliacao]) => {
      if (avaliacao > 0 && mapaFaixasAlbuns[idFaixa]) {
        idsAlbuns.add(mapaFaixasAlbuns[idFaixa]);
      }
    });

    // Para cada álbum, salvar as avaliações no Firebase
    const albumPromises = Array.from(idsAlbuns).map(async (albumId) => {
      try {
        // Buscar detalhes do álbum do Spotify
        const detalhesAlbum = await buscarDetalhesAlbum(albumId);

        // Filtrar as avaliações apenas para as faixas deste álbum
        const avaliacoesDoAlbum = {};
        Object.entries(avaliacoesFaixas).forEach(([idFaixa, avaliacao]) => {
          if (mapaFaixasAlbuns[idFaixa] === albumId && avaliacao > 0) {
            avaliacoesDoAlbum[idFaixa] = avaliacao;
          }
        });

        // Carregar preferências do álbum
        const prefsFaixas = JSON.parse(
          localStorage.getItem(`preferencias_${albumId}`) || "{}"
        );

        // Preparar objeto de preferências
        const preferencias = {};
        if (prefsFaixas.favorita || prefsFaixas.faixaFavorita) {
          preferencias.faixaFavorita =
            prefsFaixas.faixaFavorita || prefsFaixas.favorita;
        }
        if (prefsFaixas.pior || prefsFaixas.piorFaixa) {
          preferencias.piorFaixa = prefsFaixas.piorFaixa || prefsFaixas.pior;
        }

        // Salvar no Firebase
        await salvarAvaliacaoAlbum(
          albumId,
          avaliacoesDoAlbum,
          detalhesAlbum.name,
          detalhesAlbum.artists[0].name,
          detalhesAlbum.images[0]?.url || "",
          Object.keys(preferencias).length > 0 ? preferencias : null
        );

        return true;
      } catch (error) {
        console.error(`Erro ao salvar álbum ${albumId}:`, error);
        return false;
      }
    });

    await Promise.all(albumPromises);

    // Após sincronizar, carregar os dados do Firebase
    await carregarDoFirebase();
    return true;
  } catch (error) {
    console.error("Erro na sincronização com Firebase:", error);
    return false;
  }
};

/**
 * Configura um listener para sincronizar avaliações quando houver mudanças
 */
export const configurarSincronizacao = () => {
  // Função que será chamada quando as avaliações forem alteradas
  const sincronizarAoAlterar = () => {
    sincronizarAvaliacoes();
  };

  // Adiciona eventos para monitorar alterações
  window.addEventListener("avaliacoes_alteradas", sincronizarAoAlterar);

  // Retorna função para remover os listeners
  return () => {
    window.removeEventListener("avaliacoes_alteradas", sincronizarAoAlterar);
  };
};

/**
 * Evento personalizado para notificar que as avaliações foram alteradas
 */
export const notificarAvaliacoesAlteradas = () => {
  // Disparar evento
  window.dispatchEvent(new Event("avaliacoes_alteradas"));
};

/**
 * Carrega os dados de avaliações sincronizados do Firebase
 */
export const carregarAvaliacoesSincronizadas = async () => {
  try {
    // Verificar se há usuário Firebase
    const usuarioFirebase = getUsuarioAtual();

    // Se tiver usuário Firebase, carrega do Firebase
    if (usuarioFirebase) {
      const atualizadoDoFirebase = await carregarDoFirebase();
      return atualizadoDoFirebase;
    }

    return false;
  } catch (error) {
    console.error("Erro ao carregar avaliações sincronizadas:", error);
    return false;
  }
};

/**
 * Carrega avaliações do Firebase
 * @returns {Promise<Object>} Dados carregados do Firebase
 */
const carregarDoFirebase = async () => {
  try {
    // Obter álbuns do Firebase
    const albunsFirebase = await obterAlbunsAvaliados();
    if (!albunsFirebase || albunsFirebase.length === 0) {
      return { avaliacoesFaixas: {}, mapaFaixasAlbuns: {} };
    }

    // Objeto para armazenar todas as avaliações
    let avaliacoesFaixas = {};
    let mapaFaixasAlbuns = {};

    // Para cada álbum do Firebase, processar dados
    albunsFirebase.forEach((album) => {
      // Atualizar avaliações de faixas
      Object.entries(album.avaliacoes).forEach(([idFaixa, avaliacao]) => {
        avaliacoesFaixas[idFaixa] = avaliacao;
        mapaFaixasAlbuns[idFaixa] = album.id;
      });
    });

    return { avaliacoesFaixas, mapaFaixasAlbuns };
  } catch (error) {
    console.error("Erro ao carregar dados do Firebase:", error);
    return { avaliacoesFaixas: {}, mapaFaixasAlbuns: {} };
  }
};
