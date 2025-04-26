// Funções utilitárias para gerenciar a autenticação com Spotify

/**
 * Verifica se o usuário está autenticado
 * @returns {boolean} Verdadeiro se o usuário estiver autenticado
 */
export const isAuthenticated = () => {
  const token = localStorage.getItem("spotify_token");
  if (!token) return false;

  // Se for um token de demonstração (começa com 'demo_'), considerar válido
  if (token.startsWith("demo_")) {
    // Verificar apenas a expiração
    const expiryTime = localStorage.getItem("spotify_token_expiry");
    if (expiryTime && parseInt(expiryTime) < Date.now()) {
      logout(); // O token expirou, então fazemos logout
      return false;
    }
    return true;
  }

  // Verificar se o token expirou
  const expiryTime = localStorage.getItem("spotify_token_expiry");
  if (expiryTime && parseInt(expiryTime) < Date.now()) {
    logout(); // O token expirou, então fazemos logout
    return false;
  }

  return true;
};

/**
 * Obtém o token de autenticação do Spotify
 * @returns {string|null} Token ou null se não estiver autenticado
 */
export const getAuthToken = () => {
  if (!isAuthenticated()) return null;
  return localStorage.getItem("spotify_token");
};

/**
 * Obtém dados do usuário logado
 * @returns {Object|null} Dados do usuário ou null se não estiver autenticado
 */
export const getUserData = () => {
  if (!isAuthenticated()) return null;

  const userData = localStorage.getItem("spotify_user");
  if (!userData) return null;

  try {
    return JSON.parse(userData);
  } catch (error) {
    console.error("Erro ao processar dados do usuário:", error);
    return null;
  }
};

/**
 * Encerra a sessão do usuário
 */
export const logout = () => {
  localStorage.removeItem("spotify_token");
  localStorage.removeItem("spotify_token_expiry");
  localStorage.removeItem("spotify_user");
};

/**
 * Salva os dados da autenticação
 * @param {string} token - Token de acesso
 * @param {number} expiresIn - Tempo de expiração em segundos
 */
export const saveAuth = (token, expiresIn) => {
  const expiryTime = Date.now() + expiresIn * 1000;
  localStorage.setItem("spotify_token", token);
  localStorage.setItem("spotify_token_expiry", expiryTime.toString());
};

/**
 * Salva os dados do usuário
 * @param {Object} userData - Dados do usuário
 */
export const saveUserData = (userData) => {
  localStorage.setItem(
    "spotify_user",
    JSON.stringify({
      id: userData.id,
      name: userData.display_name,
      email: userData.email,
      image: userData.images?.[0]?.url || null,
    })
  );
};
