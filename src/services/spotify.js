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
  },
};

// Verifica se está em modo de demonstração
const isDemoMode = () => {
  const token = getAuthToken();
  return token && token.startsWith("demo_");
};

/**
 * Gerenciador de requisições com tratamento de erros
 * @param {string} url - URL da requisição
 * @param {Object} options - Opções da requisição
 * @returns {Promise<Object>} Dados da resposta
 * @throws {Error} Erro formatado em caso de falha
 */
async function fetchWithErrorHandling(url, options) {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
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
    console.error("Erro na requisição:", error);
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
      console.log("Usando dados mockados para buscarArtista");
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
    // Se estiver em modo demo, retornar dados mockados
    if (isDemoMode()) {
      console.log("Usando dados mockados para buscarAlbum");
      return mockData.albums;
    }

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
    // Se estiver em modo demo, retornar dados mockados
    if (isDemoMode()) {
      console.log("Usando dados mockados para buscarAlbunsPorArtista");
      return mockData.albums;
    }

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
    // Se estiver em modo demo, retornar dados mockados
    if (isDemoMode()) {
      console.log("Usando dados mockados para buscarFaixasPorAlbum");
      return mockData.tracks;
    }

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
 * Busca detalhes de um álbum específico pelo ID
 * @param {string} albumId - ID do álbum no Spotify
 * @returns {Promise<Object>} Dados detalhados do álbum
 */
export async function buscarDetalhesAlbum(albumId) {
  try {
    // Se estiver em modo demo, retornar dados mockados
    if (isDemoMode()) {
      console.log("Usando dados mockados para buscarDetalhesAlbum");
      return mockData.albumDetails;
    }

    const token = await getToken();

    return await fetchWithErrorHandling(
      `${URL_BASE}albums/${albumId}`,
      getAuthHeaders(token)
    );
  } catch (error) {
    console.error("Erro ao buscar detalhes do álbum:", error);
    throw new Error(
      `Não foi possível buscar os detalhes do álbum: ${error.message}`
    );
  }
}
