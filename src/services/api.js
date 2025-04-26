const CLIENT_ID = "fc70ea11d5414f3ca0d81d376fe3dc76";
const CLIENT_SECRET = "41551235bbb7440c9bb0728a61020fde";

// Função para obter o token de acesso
export const getSpotifyToken = async () => {
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

  // Extraia os dados da resposta
  const data = await response.json();

  // Retorne o token de acesso
  return data.access_token;
};

/**
 * Função para simular login com Client Credentials
 * Isso é útil para desenvolvimento, onde não queremos implementar o redirecionamento OAuth completo
 * Usa Client Credentials Flow que não tem acesso aos dados do usuário, mas permite consultar a API
 * @returns {Promise<boolean>} Verdadeiro se o login foi bem-sucedido
 */
export const loginWithClientCredentials = async () => {
  try {
    console.log("Iniciando login com Client Credentials Flow...");

    // Obter token usando Client Credentials
    const token = await getSpotifyToken();
    if (!token) {
      console.error("Não foi possível obter token de acesso");
      return false;
    }

    console.log("Token obtido com sucesso via Client Credentials");

    // Salvar o token com validade de 1 hora
    localStorage.setItem("spotify_token", token);
    localStorage.setItem(
      "spotify_token_expiry",
      (Date.now() + 3600 * 1000).toString()
    );

    // Criar um usuário "genérico" porque Client Credentials não dá acesso aos dados do usuário
    localStorage.setItem(
      "spotify_user",
      JSON.stringify({
        id: "client_credentials_user",
        name: "Usuário App",
        email: "app@example.com",
        image: null,
      })
    );

    return true;
  } catch (error) {
    console.error("Erro ao fazer login com Client Credentials:", error);
    return false;
  }
};
