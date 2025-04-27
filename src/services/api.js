const CLIENT_ID = "fc70ea11d5414f3ca0d81d376fe3dc76";
const CLIENT_SECRET = "41551235bbb7440c9bb0728a61020fde";
import { saveAuth, saveUserData, isAuthenticated } from "./auth";

// Função para obter o token de acesso
export const getSpotifyToken = async () => {
  try {
    console.log("[API] Solicitando token de acesso do Spotify");

    // Codifique as credenciais em Base64
    const credentials = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);

    // Faça a requisição para obter o token
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(
        "[API] Erro na resposta do Spotify:",
        response.status,
        errorData
      );
      return null;
    }

    // Extraia os dados da resposta
    const data = await response.json();
    console.log(
      "[API] Token obtido com sucesso, expira em:",
      data.expires_in,
      "segundos"
    );

    // Retorne o token de acesso
    return data.access_token;
  } catch (error) {
    console.error("[API] Erro ao obter token:", error);
    return null;
  }
};

/**
 * Função para simular login com Client Credentials
 * Isso é útil para desenvolvimento, onde não queremos implementar o redirecionamento OAuth completo
 * Usa Client Credentials Flow que não tem acesso aos dados do usuário, mas permite consultar a API
 * @returns {Promise<boolean>} Verdadeiro se o login foi bem-sucedido
 */
export const loginWithClientCredentials = async () => {
  try {
    console.log("[API] Iniciando login com Client Credentials Flow...");

    // Verificar se já está autenticado
    if (isAuthenticated()) {
      console.log("[API] Usuário já está autenticado, não é necessário login");
      return true;
    }

    // Obter token usando Client Credentials
    const token = await getSpotifyToken();
    if (!token) {
      console.error("[API] Não foi possível obter token de acesso");
      return false;
    }

    console.log("[API] Token obtido com sucesso via Client Credentials");

    // Salvar o token com validade de 1 hora
    saveAuth(token, 3600);

    // Criar um usuário "genérico" porque Client Credentials não dá acesso aos dados do usuário
    saveUserData({
      id: "client_credentials_user",
      display_name: "Usuário App",
      email: "app@example.com",
      images: [{ url: null }],
    });

    // Verificar se a autenticação foi bem-sucedida
    const authenticated = isAuthenticated();
    console.log(
      "[API] Autenticação realizada, estado atual:",
      authenticated ? "Sucesso" : "Falha"
    );

    return authenticated;
  } catch (error) {
    console.error("[API] Erro ao fazer login com Client Credentials:", error);
    return false;
  }
};
