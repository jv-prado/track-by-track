import { getSpotifyToken } from "./api";
import { getAuthToken } from "./auth";

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

// Dados mockados para o modo de demonstração
const mockData = {
  artists: {
    items: [
      {
        id: "demo_artist_1",
        name: "Artista Demo 1",
        images: [{ url: "https://via.placeholder.com/300" }],
        popularity: 80,
        genres: ["pop", "rock"],
      },
      {
        id: "demo_artist_2",
        name: "Artista Demo 2",
        images: [{ url: "https://via.placeholder.com/300" }],
        popularity: 75,
        genres: ["hip hop", "r&b"],
      },
    ],
    total: 2,
  },
  albums: {
    items: [
      {
        id: "demo_album_1",
        name: "Álbum Demo 1",
        images: [{ url: "https://via.placeholder.com/300" }],
        release_date: "2023-01-01",
        total_tracks: 10,
        artists: [{ name: "Artista Demo 1", id: "demo_artist_1" }],
      },
      {
        id: "demo_album_2",
        name: "Álbum Demo 2",
        images: [{ url: "https://via.placeholder.com/300" }],
        release_date: "2023-02-15",
        total_tracks: 12,
        artists: [{ name: "Artista Demo 2", id: "demo_artist_2" }],
      },
    ],
    total: 2,
  },
  tracks: {
    items: Array(10)
      .fill(0)
      .map((_, i) => ({
        id: `demo_track_${i + 1}`,
        name: `Faixa Demo ${i + 1}`,
        duration_ms: 180000 + i * 20000,
        track_number: i + 1,
        artists: [{ name: "Artista Demo 1", id: "demo_artist_1" }],
      })),
  },
  albumDetails: {
    id: "demo_album_1",
    name: "Álbum Demo Detalhado",
    images: [{ url: "https://via.placeholder.com/500" }],
    release_date: "2023-01-01",
    total_tracks: 10,
    artists: [{ name: "Artista Demo 1", id: "demo_artist_1" }],
    genres: ["pop", "rock"],
    popularity: 85,
    external_urls: {
      spotify: "https://open.spotify.com/album/demo_album_1",
    },
  },
};

// Verifica se está em modo de demonstração
const isDemoMode = () => {
  const token = getAuthToken();
  return token && token.startsWith("demo_");
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
    const response = await fetch(url, options);

    if (!response.ok) {
      // Tratamento especial para erro 429 (Too Many Requests)
      if (response.status === 429 && tentativas > 0) {
        // Obter o tempo de espera recomendado ou usar um padrão
        const retryAfter = response.headers.get("Retry-After") || 2;
        const delayMs = parseInt(retryAfter) * 1000;

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

      throw new Error(`Falha na requisição: ${errorDetails}`);
    }

    return await response.json();
  } catch (error) {
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
    // Se estiver em modo demo, retornar dados mockados
    if (isDemoMode()) {
      return mockData.artists;
    }

    const token = await getToken();
    const nomeArtistaEncodificado = encodeURIComponent(nomeArtista);

    const data = await fetchWithErrorHandling(
      `${URL_BASE}search?q=${nomeArtistaEncodificado}&type=artist`,
      getAuthHeaders(token)
    );

    return data.artists;
  } catch (error) {
    throw new Error(`Não foi possível buscar o artista: ${error.message}`);
  }
}

/**
 * Busca álbuns pelo nome
 * @param {string} nomeAlbum - Nome do álbum a ser buscado
 * @param {number} limit - Número máximo de álbuns a serem retornados (padrão: 20)
 * @param {number} offset - Número de álbuns a serem ignorados (padrão: 0)
 * @returns {Promise<Object>} Dados dos álbuns encontrados
 */
export async function buscarAlbum(nomeAlbum, limit = 20, offset = 0) {
  try {
    if (isDemoMode()) {
      return mockData.albums;
    }
    const token = await getToken();
    const nomeAlbumEncodificado = encodeURIComponent(nomeAlbum);
    const data = await fetchWithErrorHandling(
      `${URL_BASE}search?q=${nomeAlbumEncodificado}&type=album&limit=${limit}&offset=${offset}`,
      getAuthHeaders(token)
    );
    return data.albums;
  } catch (error) {
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
    // Se estiver em modo demo, retornar dados mockados
    if (isDemoMode()) {
      return mockData.albums;
    }

    const token = await getToken();

    return await fetchWithErrorHandling(
      `${URL_BASE}artists/${artistaId}/albums?include_groups=album&limit=20`,
      getAuthHeaders(token)
    );
  } catch (error) {
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
    // Se estiver em modo demo, retornar dados mockados
    if (isDemoMode()) {
      return mockData.tracks;
    }

    const token = await getToken();

    return await fetchWithErrorHandling(
      `${URL_BASE}albums/${albumId}/tracks`,
      getAuthHeaders(token)
    );
  } catch (error) {
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
    // Se estiver em modo demo, retornar dados mockados
    if (isDemoMode()) {
      return mockData.albumDetails;
    }

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
    throw new Error(
      `Não foi possível buscar os detalhes do álbum: ${error.message}`
    );
  }
}

/**
 * Busca singles pelo nome
 * @param {string} nomeSingle - Nome do single a ser buscado
 * @param {number} limit - Número máximo de singles a serem retornados (padrão: 20)
 * @param {number} offset - Número de singles a serem ignorados (padrão: 0)
 * @returns {Promise<Object>} Dados dos singles encontrados
 */
export async function buscarSingle(nomeSingle, limit = 20, offset = 0) {
  try {
    if (isDemoMode()) {
      return mockData.albums;
    }
    const token = await getToken();
    const nomeSingleEncodificado = encodeURIComponent(nomeSingle);
    const data = await fetchWithErrorHandling(
      `${URL_BASE}search?q=${nomeSingleEncodificado}&type=album&include_groups=single&limit=${limit}&offset=${offset}`,
      getAuthHeaders(token)
    );
    return data.albums;
  } catch (error) {
    throw new Error(`Não foi possível buscar o single: ${error.message}`);
  }
}
