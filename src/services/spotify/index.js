import { getSpotifyToken } from "../api";
import { getAuthToken } from "../auth";

/**
 * URL base da API do Spotify
 */
const URL_BASE = "https://api.spotify.com/v1/";

/**
 * Configuração padrão para os headers das requisições
 * @param {string} token - Token de autenticação do Spotify
 * @returns {Object} Headers configurados com o token
 */
const getAuthHeaders = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

/**
 * Obtém o token apropriado para a requisição
 * Prioriza o token de autenticação do usuário, se disponível
 * @returns {Promise<string>} Token para autenticação
 */
const getToken = async () => {
  // Verificar se temos um token de usuário
  const userToken = getAuthToken();
  if (userToken) {
    return userToken;
  }

  // Se não temos token de usuário, usar o token de cliente
  return await getSpotifyToken();
};

/**
 * Gerenciador de requisições com tratamento de erros e retry para limites de taxa
 * @param {string} url - URL da requisição
 * @param {Object} options - Opções da requisição
 * @param {number} tentativas - Número de tentativas restantes (padrão: 3)
 * @returns {Promise<Object>} Dados da resposta
 * @throws {Error} Erro formatado em caso de falha
 */
async function fetchWithErrorHandling(url, options, tentativas = 3) {
  try {
    console.log(`[Spotify] Requisitando: ${url}`);
    const response = await fetch(url, options);

    if (!response.ok) {
      // Tratamento especial para erro 429 (Too Many Requests)
      if (response.status === 429 && tentativas > 0) {
        // Obter o tempo de espera recomendado ou usar um padrão
        const retryAfter = response.headers.get("Retry-After") || 2;
        const delayMs = parseInt(retryAfter) * 1000;

        console.warn(
          `Limite de requisições atingido. Aguardando ${retryAfter}s antes de tentar novamente...`
        );

        // Esperar pelo tempo recomendado
        await new Promise((resolve) => setTimeout(resolve, delayMs));

        // Tentar novamente com uma tentativa a menos
        return fetchWithErrorHandling(url, options, tentativas - 1);
      }

      // Tenta obter os detalhes do erro da resposta
      let errorDetails = "";
      try {
        const errorData = await response.json();
        errorDetails = errorData.error
          ? `${errorData.error.status}: ${errorData.error.message}`
          : `Código ${response.status}`;
      } catch (e) {
        errorDetails = `Código ${response.status}`;
      }

      // Para erros 404, retornar um objeto vazio compatível com a estrutura esperada
      // em vez de lançar um erro, para evitar quebrar a interface
      if (response.status === 404) {
        console.warn(`[Spotify] Recurso não encontrado: ${url}`);
        // Retorna um objeto "vazio" que é compatível com a estrutura esperada
        return { tracks: [], albums: { items: [] }, artists: { items: [] } };
      }

      throw new Error(`Falha na requisição: ${errorDetails}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Erro na requisição:", error);
    // Se for um erro de rede, tentar novamente se ainda houver tentativas
    if (error.name === "TypeError" && tentativas > 0) {
      console.warn(
        `Erro de rede detectado, tentando novamente... (${tentativas} tentativas restantes)`
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return fetchWithErrorHandling(url, options, tentativas - 1);
    }
    throw new Error(
      `Não foi possível completar a requisição: ${error.message}`
    );
  }
}

/**
 * Busca artistas pelo nome
 * @param {string} nomeArtista - Nome do artista a ser buscado
 * @returns {Promise<Object>} Dados dos artistas encontrados
 */
export async function buscarArtista(nomeArtista) {
  try {
    const token = await getToken();
    const nomeArtistaEncodificado = encodeURIComponent(nomeArtista);

    const data = await fetchWithErrorHandling(
      `${URL_BASE}search?q=${nomeArtistaEncodificado}&type=artist`,
      getAuthHeaders(token)
    );

    return data.artists;
  } catch (error) {
    console.error("Erro ao buscar artista:", error);
    throw new Error(`Não foi possível buscar o artista: ${error.message}`);
  }
}

/**
 * Busca álbuns pelo nome
 * @param {string} nomeAlbum - Nome do álbum a ser buscado
 * @returns {Promise<Object>} Dados dos álbuns encontrados
 */
export async function buscarAlbum(nomeAlbum) {
  try {
    const token = await getToken();
    const nomeAlbumEncodificado = encodeURIComponent(nomeAlbum);

    const data = await fetchWithErrorHandling(
      `${URL_BASE}search?q=${nomeAlbumEncodificado}&type=album`,
      getAuthHeaders(token)
    );

    return data.albums;
  } catch (error) {
    console.error("Erro ao buscar álbum:", error);
    throw new Error(`Não foi possível buscar o álbum: ${error.message}`);
  }
}

/**
 * Busca álbuns de um artista específico pelo ID
 * @param {string} artistaId - ID do artista no Spotify
 * @returns {Promise<Object>} Dados dos álbuns do artista
 */
export async function buscarAlbunsPorArtista(artistaId) {
  try {
    const token = await getToken();

    return await fetchWithErrorHandling(
      `${URL_BASE}artists/${artistaId}/albums?include_groups=album&limit=20`,
      getAuthHeaders(token)
    );
  } catch (error) {
    console.error("Erro ao buscar álbuns do artista:", error);
    throw new Error(
      `Não foi possível buscar os álbuns do artista: ${error.message}`
    );
  }
}

/**
 * Busca faixas de um álbum específico pelo ID
 * @param {string} albumId - ID do álbum no Spotify
 * @returns {Promise<Object>} Dados das faixas do álbum
 */
export async function buscarFaixasPorAlbum(albumId) {
  try {
    const token = await getToken();

    return await fetchWithErrorHandling(
      `${URL_BASE}albums/${albumId}/tracks`,
      getAuthHeaders(token)
    );
  } catch (error) {
    console.error("Erro ao buscar faixas do álbum:", error);
    throw new Error(
      `Não foi possível buscar as faixas do álbum: ${error.message}`
    );
  }
}

/**
 * Busca detalhes de um álbum específico pelo ID com gerenciamento de taxa de requisições
 * @param {string} albumId - ID do álbum no Spotify
 * @returns {Promise<Object>} Dados detalhados do álbum
 */
export async function buscarDetalhesAlbum(albumId) {
  try {
    // Verificar se o albumId é válido
    if (!albumId || albumId.trim() === "") {
      throw new Error("ID do álbum inválido ou não fornecido");
    }

    const token = await getToken();

    const resultado = await fetchWithErrorHandling(
      `${URL_BASE}albums/${albumId}`,
      getAuthHeaders(token)
    );

    if (!resultado || !resultado.id) {
      throw new Error(`Álbum não encontrado: ${albumId}`);
    }

    return resultado;
  } catch (error) {
    console.error("Erro ao buscar detalhes do álbum:", error);
    throw new Error(
      `Não foi possível buscar os detalhes do álbum: ${error.message}`
    );
  }
}

/**
 * Busca as playlists em destaque no Spotify
 * @param {string} country - Código do país para personalização (opcional)
 * @param {number} limit - Número máximo de itens a retornar (padrão: 10)
 * @returns {Promise<Object>} Dados das playlists em destaque
 */
export async function buscarPlaylistsEmDestaque(country = "BR", limit = 10) {
  try {
    const token = await getToken();

    return await fetchWithErrorHandling(
      `${URL_BASE}browse/featured-playlists?country=${country}&limit=${limit}`,
      getAuthHeaders(token)
    );
  } catch (error) {
    console.error("Erro ao buscar playlists em destaque:", error);
    throw new Error(
      `Não foi possível buscar as playlists em destaque: ${error.message}`
    );
  }
}

/**
 * Busca os novos lançamentos de álbuns no Spotify
 * @param {string} country - Código do país para personalização (opcional)
 * @param {number} limit - Número máximo de itens a retornar (padrão: 10)
 * @returns {Promise<Object>} Dados dos novos lançamentos
 */
export async function buscarNovosLancamentos(country = "BR", limit = 10) {
  try {
    const token = await getToken();

    return await fetchWithErrorHandling(
      `${URL_BASE}browse/new-releases?country=${country}&limit=${limit}`,
      getAuthHeaders(token)
    );
  } catch (error) {
    console.error("Erro ao buscar novos lançamentos:", error);
    throw new Error(
      `Não foi possível buscar os novos lançamentos: ${error.message}`
    );
  }
}

/**
 * Busca singles recentes no Spotify
 * @param {number} limit - Número máximo de itens a retornar (padrão: 10)
 * @returns {Promise<Object>} Dados dos singles recentes
 */
export async function buscarSinglesRecentes(limit = 10) {
  try {
    const token = await getToken();

    return await fetchWithErrorHandling(
      `${URL_BASE}browse/new-releases?limit=${limit}&country=BR&offset=0`,
      getAuthHeaders(token)
    );
  } catch (error) {
    console.error("Erro ao buscar singles recentes:", error);
    throw new Error(
      `Não foi possível buscar os singles recentes: ${error.message}`
    );
  }
}

/**
 * Busca as categorias de playlists no Spotify
 * @param {string} country - Código do país para personalização (opcional)
 * @param {number} limit - Número máximo de itens a retornar (padrão: 20)
 * @returns {Promise<Object>} Dados das categorias
 */
export async function buscarCategorias(country = "BR", limit = 20) {
  try {
    const token = await getToken();

    return await fetchWithErrorHandling(
      `${URL_BASE}browse/categories?country=${country}&limit=${limit}`,
      getAuthHeaders(token)
    );
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
    throw new Error(`Não foi possível buscar as categorias: ${error.message}`);
  }
}

/**
 * Busca artistas populares com base em um gênero específico
 * @param {string} genero - Gênero musical para filtrar os artistas
 * @param {number} limit - Número máximo de itens a retornar (padrão: 10)
 * @returns {Promise<Object>} Dados dos artistas populares
 */
export async function buscarArtistasPorGenero(genero = "pop", limit = 10) {
  try {
    const token = await getToken();

    try {
      // Fazer uma busca de artistas com base no gênero
      const searchData = await fetchWithErrorHandling(
        `${URL_BASE}search?q=genre:${encodeURIComponent(
          genero
        )}&type=artist&limit=${limit}`,
        getAuthHeaders(token)
      );

      // Se encontrou artistas, retornar os resultados
      if (searchData && searchData.artists && searchData.artists.items) {
        // Ordenar por popularidade (do mais popular para o menos popular)
        const artistasSorted = [...searchData.artists.items].sort(
          (a, b) => b.popularity - a.popularity
        );

        return {
          artists: {
            ...searchData.artists,
            items: artistasSorted,
          },
        };
      }

      // Fallback: Se não encontrou resultados por gênero, tentar buscar artistas populares
      console.log("Não encontrou artistas pelo gênero, usando fallback");
      const fallbackData = await fetchWithErrorHandling(
        `${URL_BASE}search?q=${encodeURIComponent(
          "artist:" + genero
        )}&type=artist&limit=${limit}`,
        getAuthHeaders(token)
      );

      return fallbackData || { artists: { items: [] } };
    } catch (error) {
      console.warn("Erro na busca de artistas por gênero:", error);
      // Retornar uma estrutura vazia compatível
      return { artists: { items: [] } };
    }
  } catch (error) {
    console.error("Erro ao buscar artistas por gênero:", error);
    // Retornar uma estrutura vazia em vez de lançar erro
    return { artists: { items: [] } };
  }
}

/**
 * Busca as faixas mais tocadas ou em destaque
 * @param {string} country - Código do país para personalização (padrão: BR)
 * @param {number} limit - Quantidade de faixas a retornar (padrão: 10)
 * @returns {Promise<Object>} Dados das faixas populares
 */
export async function buscarTopTracks(country = "BR", limit = 10) {
  try {
    const token = await getToken();

    // Utilizando o endpoint de browse/featured-playlists para obter playlists em destaque
    const playlistsResponse = await fetchWithErrorHandling(
      `${URL_BASE}browse/featured-playlists?country=${country}&limit=1`,
      getAuthHeaders(token)
    );

    // Se não encontrou playlists, tenta outro endpoint
    if (
      !playlistsResponse.playlists ||
      !playlistsResponse.playlists.items ||
      playlistsResponse.playlists.items.length === 0
    ) {
      // Usa o endpoint de recomendações como fallback
      const recsResponse = await fetchWithErrorHandling(
        `${URL_BASE}recommendations?seed_genres=pop,rock,hip-hop&limit=${limit}`,
        getAuthHeaders(token)
      );

      return {
        tracks: recsResponse.tracks || [],
      };
    }

    // Obtém a primeira playlist em destaque
    const featuredPlaylist = playlistsResponse.playlists.items[0];

    // Busca as faixas dessa playlist
    const tracksResponse = await fetchWithErrorHandling(
      `${URL_BASE}playlists/${featuredPlaylist.id}/tracks?limit=${limit}`,
      getAuthHeaders(token)
    );

    // Extrair as tracks do resultado e formatá-las
    return {
      tracks: tracksResponse.items
        ? tracksResponse.items
            .map((item) => item.track)
            .filter((track) => track) // Filtra tracks null/undefined
        : [],
    };
  } catch (error) {
    console.error("Erro ao buscar faixas mais tocadas:", error);
    // Retornar um array vazio em vez de lançar erro
    return { tracks: [] };
  }
}
