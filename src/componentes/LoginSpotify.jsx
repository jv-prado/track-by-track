import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "./sidebar/assets/Logo.svg";
import { isAuthenticated } from "../services/auth";
import { loginWithClientCredentials } from "../services/api";

// ID do Cliente do Spotify - Deve ser substituído pelo ID do seu próprio aplicativo registrado no Spotify Developer Dashboard
const CLIENT_ID = "fc70ea11d5414f3ca0d81d376fe3dc76"; // ID do app oficial usado pela API

// URL de redirecionamento deve corresponder exatamente à configurada no Spotify Developer Dashboard
// const REDIRECT_URI = window.location.origin + "/callback"; // URL dinâmica
const REDIRECT_URI = "http://localhost:5173/callback"; // URL fixa para desenvolvimento atualizada
const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
const RESPONSE_TYPE = "token";
const SCOPES = [
  "user-read-private",
  "user-read-email",
  "user-library-read",
  "playlist-read-private",
  "user-top-read",
  "user-read-recently-played",
];

// Componente de instruções para configuração
const InstrucoesConfiguracao = () => {
  // Detectar URL atual para instruções mais precisas
  const portaAtual = window.location.port || "80";
  const urlCompleta = `http://localhost:${portaAtual}/callback`;

  return (
    <div className="mt-8 p-4 bg-gray-800 rounded-lg text-left">
      <h3 className="text-lg font-semibold text-white mb-2">
        Configuração do Spotify Dashboard
      </h3>
      <p className="text-gray-400 mb-2 text-sm">
        O erro "INVALID_CLIENT: Invalid redirect URI" ocorre quando a URL de
        redirecionamento não corresponde à configurada no Spotify Dashboard.
      </p>

      <div className="mb-4 p-3 bg-gray-700 rounded">
        <h4 className="font-medium text-white text-sm mb-1">
          Informações atuais:
        </h4>
        <p className="text-gray-300 text-xs mb-1">
          • Client ID em uso:{" "}
          <code className="bg-gray-600 px-1 rounded">{CLIENT_ID}</code>
        </p>
        <p className="text-gray-300 text-xs mb-1">
          • URL de redirecionamento configurada:{" "}
          <code className="bg-gray-600 px-1 rounded">{REDIRECT_URI}</code>
        </p>
        <p className="text-gray-300 text-xs">
          • URL atual detectada:{" "}
          <code className="bg-gray-600 px-1 rounded">{urlCompleta}</code>
        </p>
      </div>

      <p className="text-gray-400 mb-2 text-sm">
        Siga estas instruções para configurar corretamente:
      </p>
      <ol className="text-gray-400 list-decimal pl-5 text-sm space-y-1">
        <li>
          Acesse o{" "}
          <a
            href="https://developer.spotify.com/dashboard"
            target="_blank"
            className="text-green-400 hover:underline"
          >
            Spotify Developer Dashboard
          </a>
        </li>
        <li>Faça login com sua conta do Spotify</li>
        <li>Selecione seu aplicativo ou crie um novo</li>
        <li>Clique em "Edit Settings"</li>
        <li>
          Em "Redirect URIs", adicione exatamente:{" "}
          <code className="bg-gray-600 px-2 py-1 rounded font-bold">
            {REDIRECT_URI}
          </code>
        </li>
        <li>Salve as configurações</li>
        <li>
          Copie o Client ID gerado e substitua no código (se diferente do atual)
        </li>
      </ol>

      <div className="mt-4 p-2 bg-yellow-900 bg-opacity-30 rounded border border-yellow-700">
        <p className="text-yellow-300 text-xs">
          <strong>Importante:</strong> A URL de redirecionamento deve
          corresponder <span className="underline">exatamente</span> à
          configurada, incluindo protocolo (http/https), porta e caminho.
        </p>
      </div>

      <div className="mt-4">
        <p className="text-sm text-white">Alternativa rápida:</p>
        <p className="text-xs text-gray-400">
          Use o botão "Login Direto" para acessar a aplicação sem configurar o
          Spotify.
        </p>
      </div>
    </div>
  );
};

const LoginSpotify = () => {
  const navigate = useNavigate();
  const [verificando, setVerificando] = useState(true);
  const [mostrarInstrucoes, setMostrarInstrucoes] = useState(false);
  const [carregandoClientCreds, setCarregandoClientCreds] = useState(false);

  // Verificar se já está autenticado
  useEffect(() => {
    console.log("LoginSpotify: Verificando autenticação...");
    console.log("LoginSpotify: isAuthenticated() =", isAuthenticated());
    console.log("LoginSpotify: REDIRECT_URI =", REDIRECT_URI);

    if (isAuthenticated()) {
      console.log(
        "LoginSpotify: Usuário autenticado, redirecionando para /feed"
      );
      navigate("/feed");
    } else {
      console.log(
        "LoginSpotify: Usuário não autenticado, mostrando tela de login"
      );
      setVerificando(false);
    }
  }, [navigate]);

  // Função para fazer login via Client Credentials
  const handleLoginClientCredentials = async () => {
    try {
      setCarregandoClientCreds(true);
      const sucesso = await loginWithClientCredentials();

      if (sucesso) {
        console.log("Login com Client Credentials bem-sucedido");
        navigate("/feed");
      } else {
        console.error("Falha no login com Client Credentials");
        alert("Não foi possível fazer login. Tente novamente.");
      }
    } catch (error) {
      console.error("Erro durante login com Client Credentials:", error);
      alert("Erro ao fazer login: " + error.message);
    } finally {
      setCarregandoClientCreds(false);
    }
  };

  // Gerar URL de autenticação do Spotify
  const getSpotifyLoginUrl = () => {
    const scopes = SCOPES.join(" ");

    // Usar o origin completo para garantir que o redirecionamento funcione corretamente
    const redirectUri = encodeURIComponent(REDIRECT_URI);

    const url = `${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&redirect_uri=${redirectUri}&scope=${encodeURIComponent(
      scopes
    )}&response_type=${RESPONSE_TYPE}&show_dialog=true`;

    console.log("LoginSpotify: URL de login =", url);
    return url;
  };

  // Se ainda estiver verificando a autenticação, mostrar carregamento
  if (verificando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-verde-destaque mx-auto"></div>
          <p className="mt-4 text-gray-400">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Tela de login
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black p-4">
      <div className="bg-cinza-escuro p-8 md:p-10 rounded-xl shadow-2xl max-w-md w-full">
        <div className="flex flex-col items-center">
          <div className="mb-8">
            <img
              src={Logo}
              alt="Logo do aplicativo"
              className="w-32 md:w-40 animate-float hover:animate-none hover:scale-110 transition-all duration-500"
            />
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-verde-destaque mb-4 text-center animate-fadeIn">
            Track by Track
          </h1>

          <p
            className="text-gray-400 mb-8 text-center animate-fadeIn"
            style={{ animationDelay: "0.3s" }}
          >
            Seu aplicativo para descobrir, avaliar e acompanhar suas músicas
            favoritas. Organize suas avaliações faixa por faixa e construa sua
            biblioteca musical personalizada.
          </p>

          <a
            href={getSpotifyLoginUrl()}
            className="bg-[#1DB954] text-white w-full py-3 px-6 rounded-full font-bold hover:bg-[#1ED760] transition-all transform hover:scale-105 flex items-center justify-center cursor-pointer"
            onClick={() => {
              console.log("LoginSpotify: Botão de login clicado");
            }}
          >
            <svg
              className="w-6 h-6 mr-3"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM16.5563 16.5563C16.3204 16.7922 15.9466 16.7922 15.7107 16.5563C14.0323 14.878 11.6597 14.4715 8.31426 15.2266C7.94716 15.3042 7.58622 15.0838 7.50864 14.7167C7.43105 14.3497 7.65147 13.9887 8.01857 13.9111C11.7247 13.0695 14.4658 13.5639 16.4414 15.5394C16.6773 15.7753 16.6773 16.1491 16.4414 16.385L16.5563 16.5563ZM17.8518 13.8814C17.5678 14.1654 17.0931 14.1654 16.8091 13.8814C14.8506 11.9229 11.5757 11.355 8.5202 12.3117C8.09402 12.4354 7.64527 12.1896 7.52156 11.7634C7.39784 11.3372 7.64373 10.8884 8.06991 10.7647C11.5387 9.67492 15.2284 10.3194 17.5372 12.6283C17.8212 12.9123 17.8212 13.387 17.5372 13.671L17.8518 13.8814ZM17.9524 11.1061C15.5732 8.72686 11.2743 8.42687 8.05871 9.33444C7.58445 9.47127 7.08259 9.18426 6.94576 8.71C6.80893 8.23574 7.09594 7.73387 7.5702 7.59705C11.2115 6.55517 15.9753 6.90516 18.7542 9.68405C19.0757 10.0056 19.0757 10.5434 18.7542 10.8649C18.4326 11.1865 17.8949 11.1865 17.5733 10.8649L17.9524 11.1061Z" />
            </svg>
            Autenticação com Spotify
          </a>

          <button
            onClick={handleLoginClientCredentials}
            disabled={carregandoClientCreds}
            className={`mt-4 w-full bg-purple-900 text-gray-200 py-3 px-6 rounded-full font-medium hover:bg-purple-800 transition-all flex items-center justify-center cursor-pointer ${
              carregandoClientCreds
                ? "opacity-70 cursor-wait"
                : "cursor-pointer hover:scale-105 transform"
            }`}
          >
            {carregandoClientCreds ? (
              <span className="animate-spin mr-2">⏳</span>
            ) : (
              <span className="mr-2">🔑</span>
            )}
            Login Direto (sem configuração)
          </button>

          <div className="mt-6 w-full">
            <p className="text-xs text-center text-gray-500 mb-2">
              Opções de login:
            </p>
            <ul className="text-xs text-gray-400 pl-5 space-y-1">
              <li>
                <span className="text-[#1DB954] font-bold">
                  Autenticação Spotify:
                </span>{" "}
                Login completo com sua conta (requer configuração)
              </li>
              <li>
                <span className="text-purple-400 font-bold">Login Direto:</span>{" "}
                Acesso rápido sem configuração (recomendado)
              </li>
            </ul>
          </div>

          <button
            className="mt-4 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
            onClick={() => setMostrarInstrucoes(!mostrarInstrucoes)}
          >
            {mostrarInstrucoes
              ? "Ocultar instruções"
              : "Problemas ao fazer login?"}
          </button>

          {mostrarInstrucoes && <InstrucoesConfiguracao />}

          <p className="mt-6 text-xs text-gray-500 text-center">
            Ao entrar, você concorda com os termos de uso e política de
            privacidade do aplicativo.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginSpotify;
