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
  console.log(
    "[Auth] Verificação de autenticação:",
    authenticated,
    "Token expira em:",
    new Date(authState.tokenExpiry).toLocaleTimeString()
  );
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
  console.log("[Auth] Realizando logout - limpando token e dados do usuário");
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
  console.log(
    "[Auth] Salvando token com expiração em:",
    new Date(expiryTime).toLocaleString()
  );
  authState.token = token;
  authState.tokenExpiry = expiryTime;
};

/**
 * Salva os dados do usuário
 * @param {Object} userData - Dados do usuário
 */
export const saveUserData = (userData) => {
  console.log(
    "[Auth] Salvando dados do usuário:",
    userData ? userData.id : "null"
  );
  authState.userData = userData;
};

/**
 * Tenta recuperar a autenticação
 * Para uso em modo de demonstração
 * @returns {Promise<boolean>} Verdadeiro se conseguiu recuperar a autenticação
 */
export const recuperarAutenticacao = async () => {
  console.log("[Auth] Iniciando recuperação de autenticação");

  // Se já está autenticado, não precisa recuperar
  if (isAuthenticated()) {
    console.log("[Auth] Já está autenticado, não é necessário recuperar");
    return true;
  }

  // Importar dinamicamente para evitar dependência circular
  const { loginWithClientCredentials } = await import("./api");

  try {
    console.log("[Auth] Tentando login com credenciais do cliente");
    const sucesso = await loginWithClientCredentials();

    // Verificar novamente o estado de autenticação após o login
    if (sucesso) {
      console.log("[Auth] Login com client credentials bem-sucedido");
      // Vamos verificar de novo se o token foi salvo corretamente
      console.log(
        "[Auth] Estado após login:",
        "Token presente:",
        !!authState.token,
        "Expiry presente:",
        !!authState.tokenExpiry,
        "Autenticado:",
        isAuthenticated()
      );
      return isAuthenticated();
    } else {
      console.log("[Auth] Falha no login com client credentials");
      return false;
    }
  } catch (error) {
    console.error("[Auth] Erro ao recuperar autenticação:", error);
    return false;
  }
};
