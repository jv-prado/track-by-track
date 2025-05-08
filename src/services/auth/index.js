/**
 * Utilitários para autenticação do usuário
 */

// Estado temporário em memória (substitui localStorage)
const authState = {
  token: null,
  tokenExpiry: null,
  userData: null,
};

/**
 * Verifica se o usuário está autenticado
 * @returns {boolean} Verdadeiro se o usuário estiver autenticado
 */
export const isAuthenticated = () => {
  // Verifica se há um token e se ele não está expirado
  if (!authState.token || !authState.tokenExpiry) return false;

  const authenticated = authState.tokenExpiry > Date.now();
  return authenticated;
};

/**
 * Obtém o token de autenticação do usuário
 * @returns {string|null} Token de autenticação ou null se não autenticado
 */
export const getAuthToken = () => {
  if (!isAuthenticated()) return null;
  return authState.token;
};

/**
 * Obtém dados do usuário autenticado
 * @returns {Object|null} Dados do usuário ou null se não autenticado
 */
export const getUserData = () => {
  if (!isAuthenticated()) return null;
  return authState.userData;
};

/**
 * Limpa os dados de autenticação
 */
export const logout = () => {
  authState.token = null;
  authState.tokenExpiry = null;
  authState.userData = null;
};

/**
 * Salva os dados da autenticação
 * @param {string} token - Token de acesso
 * @param {number} expiresIn - Tempo de expiração em segundos
 */
export const saveAuth = (token, expiresIn) => {
  const expiryTime = Date.now() + expiresIn * 1000;
  authState.token = token;
  authState.tokenExpiry = expiryTime;
};

/**
 * Salva os dados do usuário
 * @param {Object} userData - Dados do usuário
 */
export const saveUserData = (userData) => {
  authState.userData = userData;
};

/**
 * Tenta recuperar a autenticação
 * Para uso em modo de demonstração
 * @returns {Promise<boolean>} Verdadeiro se conseguiu recuperar a autenticação
 */
export const recuperarAutenticacao = async () => {
  // Se já está autenticado, não precisa recuperar
  if (isAuthenticated()) {
    return true;
  }

  // Importar dinamicamente para evitar dependência circular
  const { loginWithClientCredentials } = await import("./api");

  try {
    const sucesso = await loginWithClientCredentials();

    // Verificar novamente o estado de autenticação após o login
    if (sucesso) {
      return isAuthenticated();
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
};
