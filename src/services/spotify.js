import { getSpotifyToken } from "./api";
import { getAuthToken } from "./auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
} from "firebase/firestore";
import { getApp } from "firebase/app";

/**
 * URL base da API do Spotify
 */
const URL_BASE = "https://api.spotify.com/v1/";

// Obtém a instância do Firestore para uso nas funções de persistência
const db = getFirestore(getApp());

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
  // Primeiro verificar se há um token do Spotify válido
  const spotifyToken = localStorage.getItem("spotify_access_token");
  const spotifyTokenExpiry = localStorage.getItem("spotify_token_expires_at");

  if (
    spotifyToken &&
    spotifyTokenExpiry &&
    Date.now() < parseInt(spotifyTokenExpiry)
  ) {
    console.log("Usando token do Spotify");
    return spotifyToken;
  }

  // Se não tiver token Spotify válido mas tiver refresh token, tentar renovar
  const refreshToken = localStorage.getItem("spotify_refresh_token");
  if (refreshToken) {
    try {
      console.log("Tentando renovar token do Spotify");
      const tokenAtualizado = await atualizarToken();
      if (tokenAtualizado) {
        console.log("Token do Spotify renovado com sucesso");
        return localStorage.getItem("spotify_access_token");
      }
    } catch (err) {
      console.error("Erro ao atualizar token do Spotify:", err);
    }
  }

  // Verificar se temos um token de usuário via Firebase
  const userToken = getAuthToken();
  if (userToken) {
    console.log("Usando token de usuário autenticado via Firebase");
    return userToken;
  }

  // Verificar se estamos no modo demo
  if (isDemoMode()) {
    console.log("Usando token de modo demo");
    return "demo_token";
  }

  // Se não temos token de usuário nem estamos em modo demo,
  // esperamos que o usuário faça login antes de usar funcionalidades que precisam de autenticação
  console.log("Nenhum token de usuário disponível. É necessário fazer login.");

  // Verificar se temos um token de cliente em último caso (funcionalidades públicas)
  // Evitamos usar isso para funções que exigem autenticação do usuário
  const clientToken = await getSpotifyToken();
  console.log("Usando token de cliente (funcionalidades limitadas)");
  return clientToken;
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
  // Se tiver um token ou refresh token do Spotify, não estamos em modo demo
  const spotifyToken = localStorage.getItem("spotify_access_token");
  const spotifyRefreshToken = localStorage.getItem("spotify_refresh_token");

  if (spotifyToken || spotifyRefreshToken) {
    return false;
  }

  // Verificar explicitamente o modo demo através da flag no localStorage
  const demoMode = localStorage.getItem("demo_mode") === "true";

  // Verificar se há um token demo válido
  const demoToken = localStorage.getItem("demo_token");
  const demoExpiry = localStorage.getItem("demo_token_expiry");
  const demoTokenValido =
    demoToken && demoExpiry && parseInt(demoExpiry) > Date.now();

  return demoMode || demoTokenValido;
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
      console.log("Usando dados mockados no modo demo");
      return mockData.artists;
    }

    // Verificar se o usuário está autenticado
    if (!estaAutenticado()) {
      console.log("Usuário não está autenticado para buscar artistas");
      throw new Error("É necessário fazer login para buscar artistas");
    }

    const token = await getToken();
    if (!token) {
      console.error("Não foi possível obter um token válido");
      throw new Error(
        "Não foi possível autenticar. Por favor, faça login novamente."
      );
    }

    console.log("Buscando artista com token válido");
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

// Configuração da autenticação Spotify
const SPOTIFY_CLIENT_ID = "fc70ea11d5414f3ca0d81d376fe3dc76"; // Substitua pelo seu Client ID

// IMPORTANTE: O REDIRECT_URI deve ser exatamente igual ao configurado no dashboard do Spotify
// Não deve ter barra final (/) no final se não tiver no dashboard
// Deve ser consistente em todo o aplicativo
const REDIRECT_URI = (() => {
  // Suporte para ambientes de preview do Vercel
  const origin = window.location.origin;
  let uri = `${origin}/callback`;

  // Lista de domínios permitidos (produção, localhost e previews do Vercel)
  const allowedOrigins = [
    "https://www.trackbytrackapp.com",
    "http://localhost:5173",
    "http://localhost:3000",
    // Exemplo de domínio de preview do Vercel
    "https://track-by-track-git-testes-jvprado1s-projects.vercel.app",
    // Adicione outros domínios de preview se necessário
  ];

  if (!allowedOrigins.includes(origin)) {
    console.warn(
      `ATENÇÃO: O domínio ${origin} não está cadastrado como redirect_uri no painel do Spotify. Adicione este domínio para evitar erros de login.`
    );
  }

  // Logar o URI para debugging
  console.log("Configurando REDIRECT_URI:", uri);
  console.log(
    "IMPORTANTE: Este URI deve ser exatamente igual ao configurado no Spotify Developer Dashboard"
  );
  return uri;
})();

// Escopos solicitados
const SCOPES = [
  "user-read-private",
  "user-read-email",
  "user-top-read",
  "user-library-read",
  "playlist-read-private",
  "user-read-recently-played",
];

// Gera uma string aleatória para o state
const generateRandomString = (length) => {
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

// Função para gerar um code verifier para PKCE
const generateCodeVerifier = (length = 64) => {
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
};

// Função para calcular o code challenge a partir do code verifier
const generateCodeChallenge = async (codeVerifier) => {
  try {
    // Converte a string do code verifier para um array de bytes
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);

    // Calcula o hash SHA-256 do array de bytes
    const digest = await window.crypto.subtle.digest("SHA-256", data);

    // Converte o hash para base64url (importante seguir RFC corretamente)
    return btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } catch (error) {
    console.error("Erro ao gerar code challenge:", error);
    throw error;
  }
};

// Inicia o fluxo de autenticação com PKCE
export const iniciarLoginSpotify = async () => {
  try {
    // DIAGNÓSTICO: Mostrar o estado atual de login antes de iniciar novo fluxo
    console.log("[DIAGNÓSTICO] Estado do login antes de iniciar novo fluxo:");
    console.log(
      "- Token do Spotify existe:",
      !!localStorage.getItem("spotify_access_token")
    );
    console.log(
      "- Refresh token existe:",
      !!localStorage.getItem("spotify_refresh_token")
    );
    console.log(
      "- Token expira em:",
      new Date(
        parseInt(localStorage.getItem("spotify_token_expires_at") || "0")
      ).toLocaleString()
    );

    console.log("[DEBUG] Iniciando fluxo de autenticação com Spotify PKCE");
    console.log("[DEBUG] Escopos solicitados:", SCOPES.join(", "));
    console.log("[DEBUG] Redirect URI:", REDIRECT_URI);
    console.log("[DEBUG] Client ID:", SPOTIFY_CLIENT_ID);

    // Limpar TODOS os tokens e dados de autenticação anteriores
    // Isso evita conflitos entre tokens de cliente e tokens de usuário
    localStorage.clear(); // Limpar todo o localStorage para garantir um login completamente novo
    sessionStorage.clear(); // Limpar também o sessionStorage

    // Gerar e armazenar o code verifier
    const codeVerifier = generateCodeVerifier(64);
    localStorage.setItem("pkce_code_verifier", codeVerifier);

    // Verificar se foi salvo corretamente
    const storedVerifier = localStorage.getItem("pkce_code_verifier");
    console.log(
      "Code verifier armazenado com sucesso:",
      storedVerifier === codeVerifier
    );

    if (storedVerifier !== codeVerifier) {
      console.error("ERRO: Code verifier não foi armazenado corretamente");
      return;
    }

    // Gerar code challenge a partir do code verifier
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Gerar state aleatório
    const state = generateRandomString(16);
    localStorage.setItem("spotify_auth_state", state);

    // Construir URL de autorização com os parâmetros necessários
    const authUrl = new URL("https://accounts.spotify.com/authorize");

    // Garantir que todos os parâmetros são adicionados corretamente
    const params = new URLSearchParams();
    params.append("client_id", SPOTIFY_CLIENT_ID);
    params.append("response_type", "code");
    params.append("redirect_uri", REDIRECT_URI);
    params.append("state", state);
    params.append("scope", SCOPES.join(" "));
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", codeChallenge);
    params.append("show_dialog", "true"); // Força a mostrar o diálogo mesmo que o usuário já tenha autorizado

    authUrl.search = params.toString();

    console.log("Code verifier gerado:", codeVerifier.substring(0, 10) + "...");
    console.log(
      "Code challenge gerado:",
      codeChallenge.substring(0, 10) + "..."
    );
    console.log("URL de autorização completa:", authUrl.toString());

    // Verificar o conteúdo do localStorage antes do redirecionamento
    console.log("Conteúdo do localStorage antes do redirecionamento:");
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.includes("spotify") || key.includes("pkce")) {
        console.log(`${key}: ${localStorage.getItem(key).substring(0, 20)}...`);
      }
    }

    // Redirecionar para a página de autorização do Spotify
    window.location.href = authUrl.toString();
  } catch (error) {
    console.error("Erro ao iniciar fluxo de autenticação:", error);
  }
};

// Troca o código de autorização pelo token de acesso usando PKCE
export const trocarCodePorToken = async (code) => {
  try {
    console.log("Iniciando troca de código por token");

    // Verificar se o código já foi usado (checar no sessionStorage)
    const codeUsed = sessionStorage.getItem("spotify_code_used");
    if (codeUsed === code) {
      console.error("Este código de autorização já foi usado anteriormente");
      return false;
    }

    // Marcar como usado imediatamente para evitar chamadas duplicadas
    sessionStorage.setItem("spotify_code_processing", code);

    // Recuperar o code verifier armazenado anteriormente
    const codeVerifier = localStorage.getItem("pkce_code_verifier");

    if (!codeVerifier) {
      console.error("Code verifier não encontrado no localStorage");
      return false;
    }

    // Registrar mais detalhes para debug
    console.log("========== DETALHES DA TROCA DE TOKEN ==========");
    console.log(
      "Code verifier recuperado:",
      codeVerifier.substring(0, 10) + "..."
    );
    console.log(
      "Código de autorização (primeiros 10 caracteres):",
      code.substring(0, 10) + "..."
    );
    console.log("Redirect URI usado:", REDIRECT_URI);
    console.log("Client ID:", SPOTIFY_CLIENT_ID);
    console.log("=================================================");

    // Garantir que o URL seja exatamente o mesmo usado na autorização
    // O Spotify é extremamente sensível a diferenças, até mesmo barras finais
    const tokenUrl = "https://accounts.spotify.com/api/token";
    const params = new URLSearchParams();
    params.append("client_id", SPOTIFY_CLIENT_ID);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", REDIRECT_URI);
    params.append("code_verifier", codeVerifier);

    console.log("Parâmetros da requisição:", {
      client_id: SPOTIFY_CLIENT_ID,
      grant_type: "authorization_code",
      code: code.substring(0, 10) + "...",
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier.substring(0, 10) + "...",
    });

    const payload = {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    };

    console.log(`Fazendo requisição para ${tokenUrl}`);
    const response = await fetch(tokenUrl, payload);

    if (!response.ok) {
      console.error(
        `Erro na resposta do endpoint de token: ${response.status}`
      );

      try {
        const errorText = await response.text();
        console.error(`Detalhes do erro:`, errorText);

        // Tentar fazer parse do JSON mesmo se houver erro
        try {
          const errorData = JSON.parse(errorText);
          console.error("Erro decodificado:", errorData);

          // Verificar problemas específicos
          if (errorData.error === "invalid_grant") {
            console.error(
              "O código de autorização é inválido, já foi usado ou expirou."
            );

            // Limpar o verifier para forçar uma nova autorização
            localStorage.removeItem("pkce_code_verifier");
            localStorage.removeItem("spotify_auth_state");
          } else if (errorData.error === "invalid_client") {
            console.error(
              "Client ID inválido ou não autorizado para este redirect_uri."
            );
          }
        } catch (jsonError) {
          // Erro não é JSON válido
          console.error("Não foi possível fazer parse do erro como JSON");
        }
      } catch (textError) {
        console.error("Não foi possível obter texto do erro");
      }

      // Remover o código em processamento, pois falhou
      sessionStorage.removeItem("spotify_code_processing");
      return false;
    }

    const data = await response.json();
    console.log("Resposta recebida do endpoint de token:", {
      access_token: data.access_token ? "Present" : "Missing",
      refresh_token: data.refresh_token ? "Present" : "Missing",
      expires_in: data.expires_in,
      token_type: data.token_type,
      scope: data.scope,
    });

    // Verificar se os escopos necessários foram concedidos
    if (data.scope) {
      console.log("[DEBUG] Escopos concedidos:", data.scope);
      const escoposConcedidos = data.scope.split(" ");
      const escoposNecessarios = ["user-read-private", "user-read-email"];

      const escoposFaltando = escoposNecessarios.filter(
        (escopo) => !escoposConcedidos.includes(escopo)
      );

      if (escoposFaltando.length > 0) {
        console.error(
          "[ERRO] Faltam escopos críticos:",
          escoposFaltando.join(", ")
        );
        console.warn("Autenticação pode falhar em endpoints protegidos!");
      } else {
        console.log("[OK] Todos os escopos críticos foram concedidos");
      }
    } else {
      console.warn("[AVISO] Resposta não inclui informação sobre escopos");
    }

    if (data.access_token) {
      console.log("Token de acesso recebido com sucesso");
      const expiresAt = Date.now() + data.expires_in * 1000;
      localStorage.setItem("spotify_access_token", data.access_token);
      localStorage.setItem("spotify_token_expires_at", expiresAt.toString());

      // Salvar escopos concedidos para referência futura
      if (data.scope) {
        localStorage.setItem("spotify_scopes", data.scope);
      }

      if (data.refresh_token) {
        localStorage.setItem("spotify_refresh_token", data.refresh_token);
      }

      // Remover a flag de processamento
      sessionStorage.removeItem("spotify_code_processing");

      // Marcar o código como usado permanentemente
      sessionStorage.setItem("spotify_code_used", code);

      // Limpeza do verifier pois não é mais necessário
      localStorage.removeItem("pkce_code_verifier");

      return true;
    } else {
      console.error("Token de acesso não recebido na resposta");
      // Remover o código em processamento, pois falhou
      sessionStorage.removeItem("spotify_code_processing");
      return false;
    }
  } catch (error) {
    console.error("Erro ao trocar código por token:", error);
    // Remover o código em processamento em caso de erro
    sessionStorage.removeItem("spotify_code_processing");
    return false;
  }
};

// Verifica se o token está válido
export const verificarToken = () => {
  const accessToken = localStorage.getItem("spotify_access_token");
  const expiresAt = localStorage.getItem("spotify_token_expires_at");
  const spotifyAutenticado =
    localStorage.getItem("spotify_autenticado") === "true";

  // Se não tiver token nem timestamp de expiração, o token não é válido
  if (!accessToken || !expiresAt) {
    console.log(
      "Token do Spotify não encontrado ou timestamp de expiração ausente"
    );
    return false;
  }

  // Converter o timestamp para número
  const expiraEm = parseInt(expiresAt);

  // Verificar se está expirado - considerar expirado se faltar menos de 5 minutos
  const agora = Date.now();
  const tempoRestante = expiraEm - agora;
  const expiraEmMinutos = Math.floor(tempoRestante / 1000 / 60);

  // Se estiver a menos de 5 minutos para expirar, considera expirado
  const tokenValido = tempoRestante > 5 * 60 * 1000;

  if (tokenValido) {
    console.log(
      `Token do Spotify válido, expira em aproximadamente ${expiraEmMinutos} minutos`
    );
  } else {
    console.log(
      `Token do Spotify expirado ou prestes a expirar (${
        expiraEmMinutos < 0 ? "expirado há" : "expira em"
      } ${Math.abs(expiraEmMinutos)} minutos)`
    );
  }

  return tokenValido;
};

// Atualiza o token usando refresh_token
export const atualizarToken = async () => {
  const refreshToken = localStorage.getItem("spotify_refresh_token");

  if (!refreshToken) {
    console.log("Não há refresh token disponível");
    return false;
  }

  // Verificar se o refresh token parece ser válido
  if (refreshToken.length < 20) {
    console.error("Refresh token parece inválido (muito curto)");
    logout(); // Limpar tokens inválidos
    return false;
  }

  try {
    console.log("Tentando atualizar token com refresh token");
    const tokenUrl = "https://accounts.spotify.com/api/token";
    const payload = {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: SPOTIFY_CLIENT_ID,
      }),
    };

    console.log("Enviando requisição para atualizar token");
    const response = await fetch(tokenUrl, payload);

    if (!response.ok) {
      console.error(`Erro ao atualizar token: ${response.status}`);

      // Log para debug
      try {
        const errorText = await response.text();
        console.error("Erro detalhado:", errorText);
      } catch (e) {
        // Ignora erros ao tentar ler o corpo da resposta
      }

      // Se o refresh token for inválido ou expirado, limpar os tokens
      if (response.status === 400 || response.status === 401) {
        console.log("Refresh token inválido ou expirado. Limpando tokens...");
        logout();
      }
      return false;
    }

    const data = await response.json();

    if (data.access_token) {
      console.log("Token atualizado com sucesso");
      const expiresAt = Date.now() + data.expires_in * 1000;
      localStorage.setItem("spotify_access_token", data.access_token);

      // Atualiza o refresh token se um novo for fornecido
      if (data.refresh_token) {
        console.log("Novo refresh token recebido e armazenado");
        localStorage.setItem("spotify_refresh_token", data.refresh_token);
      }

      localStorage.setItem("spotify_token_expires_at", expiresAt.toString());

      // Log para confirmar quanto tempo o token é válido
      const expiresIn = Math.floor((expiresAt - Date.now()) / 1000 / 60); // em minutos
      console.log(`Novo token expira em ${expiresIn} minutos`);

      return true;
    }

    console.error("Resposta não contém access_token:", data);
    return false;
  } catch (error) {
    console.error("Erro ao atualizar token:", error);
    return false;
  }
};

// Faz chamadas para a API do Spotify
export const chamadaAPI = async (endpoint, method = "GET", body = null) => {
  // Obter o token de acesso do Spotify (diretamente ou atualizando)
  let accessToken = localStorage.getItem("spotify_access_token");
  const tokenExpiry = localStorage.getItem("spotify_token_expires_at");

  // Verificar se o token está válido ou prestes a expirar
  const tokenExpirado =
    !tokenExpiry || Date.now() >= parseInt(tokenExpiry) - 5 * 60 * 1000;

  if (!accessToken || tokenExpirado) {
    console.log("Token expirado ou prestes a expirar, tentando atualizar...");
    const tokenAtualizado = await atualizarToken();

    if (!tokenAtualizado) {
      console.error(
        "Não foi possível atualizar o token. Usuário será deslogado."
      );
      logout();
      throw new Error(
        "Token expirado e não foi possível atualizá-lo. Faça login novamente."
      );
    } else {
      console.log("Token atualizado com sucesso!");
      accessToken = localStorage.getItem("spotify_access_token");
    }
  }

  if (!accessToken) {
    throw new Error("Token de acesso não encontrado. Faça login novamente.");
  }

  // Verificar se temos dados em cache para este endpoint
  // Apenas para endpoints específicos que são seguros para cachear (/me)
  if (method === "GET" && endpoint === "/me") {
    const cacheKey = `spotify_cache_${endpoint}`;
    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData);
        // Cache válido por 24 horas para o perfil do usuário
        const cacheValido = Date.now() - timestamp < 24 * 60 * 60 * 1000;

        if (cacheValido) {
          console.log(`Usando dados em cache para ${endpoint}`);
          return data;
        }
      } catch (e) {
        console.error("Erro ao ler cache:", e);
      }
    }
  }

  const options = {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  };

  if (body && (method === "POST" || method === "PUT")) {
    options.body = JSON.stringify(body);
  }

  try {
    console.log(`Chamando API do Spotify: ${endpoint}`);
    const response = await fetch(
      `https://api.spotify.com/v1${endpoint}`,
      options
    );

    if (!response.ok) {
      // Tratamento especial para endpoint /me com erro 403
      if (response.status === 403 && endpoint === "/me") {
        console.warn(
          "[SOLUÇÃO ALTERNATIVA] Tentando método diferente para obter perfil básico do usuário devido a erro 403"
        );

        try {
          // Tentar obter ID do usuário de um endpoint menos restritivo
          const userPlaylistsResponse = await fetch(
            "https://api.spotify.com/v1/me/playlists?limit=1",
            options
          );

          if (userPlaylistsResponse.ok) {
            const playlistsData = await userPlaylistsResponse.json();

            if (playlistsData && playlistsData.href) {
              // Extrair user ID da URL do usuário
              const ownerUrlPattern = /users\/([^\/]+)/;
              const match = playlistsData.href.match(ownerUrlPattern);

              if (match && match[1]) {
                const userId = match[1];
                console.log(`[RECUPERADO] ID do usuário Spotify: ${userId}`);

                // Retornar perfil básico com ID real
                return {
                  id: userId,
                  display_name: `Usuário Spotify (${userId.substring(
                    0,
                    5
                  )}...)`,
                  email: null,
                  images: [],
                  _recuperado: true,
                };
              }
            }
          }
        } catch (altError) {
          console.error("[FALHA] Método alternativo também falhou:", altError);
        }
      }

      // Tratamento específico para erro 403 (Forbidden)
      if (response.status === 403) {
        console.warn(`Erro 403 no endpoint ${endpoint} - Permissão negada`);

        // Verificar se temos cache para este endpoint
        if (method === "GET") {
          const cacheKey = `spotify_cache_${endpoint}`;
          const cachedData = localStorage.getItem(cacheKey);

          if (cachedData) {
            try {
              console.log(`Usando cache para ${endpoint} após erro 403`);
              const { data } = JSON.parse(cachedData);
              return data;
            } catch (e) {
              console.error("Erro ao ler cache após 403:", e);
            }
          }

          // Para endpoints específicos, podemos retornar dados padrão
          if (endpoint === "/me") {
            console.log(
              "[DEBUG] Erro 403 ao buscar perfil do usuário. Isso pode indicar que o token não tem os escopos necessários."
            );
            throw new Error(
              "Erro 403: Permissão negada ao acessar o perfil do usuário."
            );
          }
        }

        throw new Error(
          `Erro 403: Permissão negada ao acessar a API do Spotify. Você precisa de privilégios adequados para acessar este recurso.`
        );
      }

      // Token expirado, tentar atualizar e tentar novamente
      if (response.status === 401) {
        console.log(
          "Token expirou durante a requisição, tentando atualizar novamente..."
        );
        const tokenAtualizado = await atualizarToken();
        if (tokenAtualizado) {
          console.log("Token atualizado, repetindo chamada à API");
          return chamadaAPI(endpoint, method, body);
        } else {
          console.error(
            "Não foi possível atualizar o token após erro 401. Usuário será deslogado."
          );
          logout();
          throw new Error(
            "Token expirado e não foi possível atualizá-lo. Faça login novamente."
          );
        }
      }

      // Outros erros da API
      let errorMessage = `Erro na API do Spotify: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.error && errorData.error.message) {
          errorMessage += ` - ${errorData.error.message}`;
        }
        console.error("Detalhes do erro:", errorData);
      } catch (e) {
        // Ignore erros ao tentar parse da resposta de erro
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Armazenar em cache apenas endpoints GET específicos
    if (method === "GET" && endpoint === "/me") {
      const cacheKey = `spotify_cache_${endpoint}`;
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        })
      );
    }

    return data;
  } catch (error) {
    console.error("Erro na chamada à API:", error);
    throw error;
  }
};

// Obtém o perfil do usuário
export const obterPerfilUsuario = async () => {
  return chamadaAPI("/me");
};

// Obtém os artistas mais ouvidos
export const obterTopArtistas = async (
  timeRange = "medium_term",
  limit = 20
) => {
  return chamadaAPI(`/me/top/artists?time_range=${timeRange}&limit=${limit}`);
};

// Obtém as músicas mais ouvidas
export const obterTopMusicas = async (
  timeRange = "medium_term",
  limit = 20
) => {
  return chamadaAPI(`/me/top/tracks?time_range=${timeRange}&limit=${limit}`);
};

// Obtém os álbuns salvos do usuário
export const obterAlbunsSalvos = async (limit = 20, offset = 0) => {
  return chamadaAPI(`/me/albums?limit=${limit}&offset=${offset}`);
};

// Verifica se está autenticado
export const estaAutenticado = () => {
  // Verificar se tem token de acesso válido
  const accessToken = localStorage.getItem("spotify_access_token");
  const tokenExpiry = localStorage.getItem("spotify_token_expires_at");
  const tokenValido =
    accessToken && tokenExpiry && parseInt(tokenExpiry) > Date.now();

  if (tokenValido) {
    console.log("Token de acesso do Spotify válido encontrado");
    return true;
  }

  // Verificar se tem refresh token que pode ser usado para renovar o token
  const refreshToken = localStorage.getItem("spotify_refresh_token");
  if (refreshToken) {
    console.log(
      "Refresh token do Spotify encontrado, usuário pode renovar autenticação"
    );
    return true;
  }

  console.log("Usuário não está autenticado com o Spotify");
  return false;
};

// Faz logout
export const logout = () => {
  localStorage.removeItem("spotify_access_token");
  localStorage.removeItem("spotify_refresh_token");
  localStorage.removeItem("spotify_token_expires_at");
  localStorage.removeItem("spotify_auth_state");
  localStorage.removeItem("spotify_user_profile");
  localStorage.removeItem("spotify_callback_processed");
  sessionStorage.removeItem("spotify_code_used");
  sessionStorage.removeItem("spotify_code_processing");
  sessionStorage.removeItem("spotify_callback_timestamp");
  sessionStorage.removeItem("spotify_callback_instance");

  console.log("Logout do Spotify realizado com sucesso");
};

/**
 * Registra ou atualiza um usuário do Spotify no Firestore
 * @param {Object} perfilUsuario - Perfil do usuário obtido da API do Spotify
 * @returns {Promise<Object>} Objeto com dados do usuário registrado
 */
export const registrarUsuarioSpotify = async (perfilUsuario) => {
  try {
    if (!perfilUsuario || !perfilUsuario.id) {
      throw new Error("Perfil de usuário inválido");
    }

    // Usar o ID do Spotify como ID do usuário no Firestore
    const userId = perfilUsuario.id;

    console.log("Tentando registrar/atualizar usuário Spotify:", userId);

    // Dados do usuário para salvar/atualizar
    const dadosUsuario = {
      nome: perfilUsuario.display_name || "Usuário Spotify",
      email: perfilUsuario.email || null,
      foto_perfil: perfilUsuario.images?.[0]?.url || null,
      ultima_atualizacao: new Date(),
    };

    try {
      // Acessar explicitamente a coleção para garantir que ela exista
      const spotifyUsersCollection = collection(db, "usuariosSpotify");
      console.log(
        "Coleção usuariosSpotify referenciada:",
        spotifyUsersCollection.path
      );

      // Verificar se o usuário já existe na coleção específica para usuários Spotify
      const userRef = doc(db, "usuariosSpotify", userId);
      let userDoc;

      try {
        userDoc = await getDoc(userRef);
      } catch (firestoreError) {
        console.error("Erro ao ler documento do Firestore:", firestoreError);
        if (firestoreError.code === "permission-denied") {
          console.warn(
            "Permissão negada ao tentar ler a coleção usuariosSpotify. Verifique as regras de segurança do Firestore."
          );
        }
        // Retorna os dados básicos mesmo se não conseguir ler do Firestore
        return {
          uid: userId,
          ...dadosUsuario,
          dados: { albuns_avaliados: [] },
        };
      }

      if (!userDoc.exists()) {
        // Criar novo usuário
        try {
          const novoUsuario = {
            ...dadosUsuario,
            albuns_avaliados: [],
            data_cadastro: new Date(),
          };

          // Usar o ID explícito do Spotify para garantir a consistência
          await setDoc(userRef, novoUsuario);
          console.log("Novo usuário do Spotify registrado:", userId);

          return {
            uid: userId,
            ...dadosUsuario,
            dados: novoUsuario,
          };
        } catch (writeError) {
          console.error("Erro ao criar documento no Firestore:", writeError);
          if (writeError.code === "permission-denied") {
            console.warn(
              "Permissão negada ao tentar criar documento na coleção usuariosSpotify. Verifique as regras de segurança do Firestore."
            );
          }
        }
      } else {
        // Atualizar usuário existente
        try {
          const dadosAtualizados = {
            ...userDoc.data(),
            ...dadosUsuario,
          };

          await setDoc(userRef, dadosAtualizados, { merge: true });
          console.log("Usuário do Spotify atualizado:", userId);

          return {
            uid: userId,
            ...dadosUsuario,
            dados: dadosAtualizados,
          };
        } catch (updateError) {
          console.error(
            "Erro ao atualizar documento no Firestore:",
            updateError
          );
          if (updateError.code === "permission-denied") {
            console.warn(
              "Permissão negada ao tentar atualizar documento na coleção usuariosSpotify. Verifique as regras de segurança do Firestore."
            );
          }
        }
      }

      return {
        uid: userId,
        ...dadosUsuario,
        dados: userDoc.exists() ? userDoc.data() : { albuns_avaliados: [] },
      };
    } catch (firestoreError) {
      console.error("Erro geral do Firestore:", firestoreError);
      // Retorna os dados básicos mesmo se houver erro do Firestore
      return {
        uid: userId,
        ...dadosUsuario,
        dados: { albuns_avaliados: [] },
      };
    }
  } catch (error) {
    console.error("Erro ao registrar usuário do Spotify:", error);
    throw error;
  }
};
