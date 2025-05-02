import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  trocarCodePorToken,
  obterPerfilUsuario,
  registrarUsuarioSpotify,
  verificarToken,
  atualizarToken,
} from "../services/spotify";
import { autenticarComSpotify } from "../services/firebase/auth-custom";
import { useAuth } from "../contexts/AuthContext";

// ID único para esta instância do componente
const CALLBACK_INSTANCE_ID = Date.now().toString();

const SpotifyCallback = () => {
  const [status, setStatus] = useState("Processando autenticação...");
  const [erro, setErro] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  // Usar useRef para garantir que processarCallback seja executado apenas uma vez
  const processadoRef = useRef(false);
  // Obter a função de verificação de autenticação do contexto
  const { verificarOutrosMetodosAutenticacao } = useAuth();

  useEffect(() => {
    alert("[DEBUG] SpotifyCallback useEffect montado");
    console.log("[DEBUG] SpotifyCallback useEffect montado");
    // Forçar autenticação customizada se houver perfil em cache
    const perfilCache = JSON.parse(
      localStorage.getItem("spotify_user_profile") || "{}"
    );
    if (perfilCache && perfilCache.id && perfilCache.id !== "spotify_user") {
      alert(
        "[DEBUG] Forçando autenticação customizada com ID do cache: " +
          perfilCache.id
      );
      console.log(
        "[DEBUG] Forçando autenticação customizada com ID do cache:",
        perfilCache.id
      );
      autenticarComSpotify(perfilCache.id).then((res) => {
        alert("[DEBUG] Resultado autenticarComSpotify: " + JSON.stringify(res));
        console.log("[DEBUG] Resultado autenticarComSpotify:", res);
      });
    } else {
      alert(
        "[DEBUG] ID do Spotify inválido para autenticação customizada: " +
          perfilCache.id
      );
      console.log(
        "[DEBUG] ID do Spotify inválido para autenticação customizada:",
        perfilCache.id
      );
    }

    // Função para salvar estado de processamento
    const marcarComoProcessado = (code) => {
      // Registrar no sessionStorage
      sessionStorage.setItem("spotify_callback_processed", code);
      // Marcar no ref local
      processadoRef.current = true;
      // Registrar timestamp para debug
      sessionStorage.setItem(
        "spotify_callback_timestamp",
        Date.now().toString()
      );
      // Registrar instância
      sessionStorage.setItem("spotify_callback_instance", CALLBACK_INSTANCE_ID);
    };

    // Verificar se já foi processado por esta ou outra instância
    const verificarProcessamento = (code) => {
      const processado = sessionStorage.getItem("spotify_callback_processed");
      if (processado === code) {
        console.log(
          `Callback com código ${code.substring(
            0,
            10
          )}... já foi processado anteriormente.`
        );
        return true;
      }
      return processadoRef.current;
    };

    const processarCallback = async () => {
      try {
        console.log(
          `[Instância ${CALLBACK_INSTANCE_ID}] Iniciando processamento do callback`
        );

        // Extrair código e state da URL
        const urlParams = new URLSearchParams(location.search);
        const code = urlParams.get("code");
        const state = urlParams.get("state");
        const error = urlParams.get("error");

        if (!code) {
          console.log("Nenhum código encontrado na URL, ignorando.");
          return;
        }

        // Verificar se este código já foi processado
        if (verificarProcessamento(code)) {
          console.log("Este callback já foi processado, ignorando duplicatas.");
          return;
        }

        // Marcar como processado imediatamente
        marcarComoProcessado(code);

        console.log(
          `[Instância ${CALLBACK_INSTANCE_ID}] Processando código: ${code.substring(
            0,
            10
          )}...`
        );

        // Verificar se o code_verifier existe no localStorage
        const codeVerifier = localStorage.getItem("pkce_code_verifier");
        console.log("Code verifier encontrado:", codeVerifier ? "Sim" : "Não");
        if (codeVerifier) {
          console.log(
            "Code verifier (primeiros 10 caracteres):",
            codeVerifier.substring(0, 10) + "..."
          );
        } else {
          console.error("Code verifier não encontrado no localStorage");
          setErro("Erro de autenticação: code_verifier não encontrado.");
          setTimeout(() => navigate("/login"), 3000);
          return;
        }

        console.log("Parâmetros URL:", {
          code: code ? code.substring(0, 10) + "..." : "Não encontrado",
          state: state || "Não encontrado",
          error: error || "Nenhum",
        });

        // Verificar se houve erro na autorização
        if (error) {
          console.error(`Spotify retornou erro: ${error}`);
          setErro(`Erro na autenticação: ${error}`);
          setTimeout(() => navigate("/login"), 3000);
          return;
        }

        // Verificar se state está faltando
        if (!state) {
          console.error("Parâmetro state está faltando");
          setErro("Parâmetro de autenticação state ausente.");
          setTimeout(() => navigate("/login"), 3000);
          return;
        }

        // Verificar se o state corresponde ao armazenado
        const savedState = localStorage.getItem("spotify_auth_state");
        console.log(
          `Verificando state: recebido=${state}, salvo=${savedState}`
        );

        if (state !== savedState) {
          console.error("Estado de autenticação inválido");
          setErro(
            "Estado de autenticação inválido. Possível tentativa de CSRF."
          );
          setTimeout(() => navigate("/login"), 3000);
          return;
        }

        // Verificar o conteúdo do localStorage antes da troca
        console.log("Conteúdo do localStorage antes da troca de token:");
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key.includes("spotify") || key.includes("pkce")) {
            console.log(
              `${key}: ${localStorage.getItem(key).substring(0, 20)}...`
            );
          }
        }

        // Trocar o código por um token de acesso
        setStatus("Obtendo tokens de acesso...");
        console.log("Trocando code por token");
        const sucesso = await trocarCodePorToken(code);

        if (sucesso) {
          console.log("Token obtido com sucesso");

          // Garantir que o modo demo esteja desativado
          localStorage.removeItem("demo_mode");
          localStorage.removeItem("demo_token");
          localStorage.removeItem("demo_token_expiry");
          localStorage.removeItem("demo_usuario");

          try {
            // Verificar e renovar o token do Spotify se necessário
            setStatus("Verificando token do Spotify...");
            const tokenValido = await verificarToken();
            if (!tokenValido) {
              console.log("[DEBUG] Token expirado, renovando...");
              setStatus("Renovando token do Spotify...");
              const renovado = await atualizarToken();
              if (!renovado) {
                throw new Error("Não foi possível renovar o token do Spotify");
              }
              console.log("[DEBUG] Token renovado com sucesso");
            } else {
              console.log("[DEBUG] Token do Spotify está válido");
            }

            // Obter o perfil do usuário para confirmar a autenticação
            setStatus("Obtendo perfil do usuário...");
            const perfilUsuario = await obterPerfilUsuario();
            console.log(
              "Perfil do usuário obtido:",
              perfilUsuario.display_name
            );

            // Salvar informações básicas do perfil para uso posterior
            const perfilCache = {
              id: perfilUsuario.id,
              name: perfilUsuario.display_name,
              email: perfilUsuario.email,
              imageUrl: perfilUsuario.images?.[0]?.url || null,
            };

            localStorage.setItem(
              "spotify_user_profile",
              JSON.stringify(perfilCache)
            );
            alert(
              "[DEBUG] Perfil do Spotify salvo no cache com ID: " +
                perfilUsuario.id
            );

            // Salvar o perfil completo no cache da API
            localStorage.setItem(
              "spotify_cache_/me",
              JSON.stringify({
                data: perfilUsuario,
                timestamp: Date.now(),
              })
            );

            // Registrar ou atualizar o usuário no Firestore (coleção usuariosSpotify)
            setStatus("Registrando usuário na coleção usuariosSpotify...");
            try {
              const userData = await registrarUsuarioSpotify(perfilUsuario);
              console.log(
                "Usuário do Spotify registrado com sucesso na coleção usuariosSpotify:",
                userData
              );
            } catch (registroError) {
              console.error(
                "Erro ao registrar usuário do Spotify no Firestore:",
                registroError
              );
              // Verificar se é um erro 403 (Permissão negada)
              if (registroError.code === "permission-denied") {
                console.warn(
                  "Permissão negada ao tentar acessar o Firestore. Verifique as regras de segurança."
                );
                setStatus(
                  "Aviso: Erro de permissão ao salvar dados. Continuando com login..."
                );
              }
              // Não interromper o fluxo em caso de erro no registro
            }

            // NOVA ETAPA: Autenticar o usuário no Firebase usando seu ID do Spotify
            setStatus("Autenticando no Firebase Auth...");
            let spotifyIdParaAuth = perfilUsuario?.id;
            // Se não houver perfilUsuario.id, tenta pegar do cache
            if (!spotifyIdParaAuth) {
              const perfilCache = JSON.parse(
                localStorage.getItem("spotify_user_profile") || "{}"
              );
              if (perfilCache && perfilCache.id) {
                spotifyIdParaAuth = perfilCache.id;
                console.log(
                  "[DEBUG] Usando ID do Spotify do cache para autenticação Firebase:",
                  spotifyIdParaAuth
                );
              }
            }
            if (spotifyIdParaAuth) {
              try {
                const authResult = await autenticarComSpotify(
                  spotifyIdParaAuth
                );
                if (authResult.success) {
                  console.log(
                    "Usuário autenticado com sucesso no Firebase Auth:",
                    authResult.user.uid
                  );
                  setStatus("Autenticado com sucesso no Firebase Auth!");
                } else {
                  console.warn(
                    "Autenticação no Firebase Auth falhou, continuando com autenticação padrão do Spotify"
                  );
                  console.error(
                    "Erro de autenticação Firebase:",
                    authResult.error
                  );
                  setStatus(
                    "Autenticado apenas com Spotify (sem Firebase Auth)"
                  );

                  // Registrar erro específico
                  if (
                    authResult.error &&
                    authResult.error.includes("Failed to fetch")
                  ) {
                    console.warn(
                      "Erro de conexão com a Cloud Function. Verificando status da função..."
                    );
                    setErro(
                      "Erro de conexão com o servidor. A função Cloud Function pode estar indisponível temporariamente. Você pode continuar usando o app com autenticação básica do Spotify."
                    );
                  }
                }
              } catch (firebaseAuthError) {
                console.error(
                  "Erro ao autenticar com Firebase:",
                  firebaseAuthError
                );

                // Verificar se é um erro de conexão
                if (
                  firebaseAuthError.message &&
                  firebaseAuthError.message.includes("Failed to fetch")
                ) {
                  console.warn(
                    "Erro de conexão com a Cloud Function ao tentar autenticar"
                  );
                  setStatus(
                    "Erro de conexão com o servidor de autenticação. Usando apenas Spotify."
                  );
                } else {
                  // Continuar com fluxo normal mesmo se a autenticação Firebase falhar
                  setStatus("Usando apenas autenticação do Spotify...");
                }

                // Não bloquear o fluxo por causa da falha na autenticação Firebase
                // Apenas continuar com a autenticação do Spotify
              }
            } else {
              console.error(
                "[DEBUG] Não foi possível obter o ID do Spotify para autenticação customizada no Firebase."
              );
            }

            // Definir flag para garantir que o app reconheça que foi feito login com Spotify
            localStorage.setItem("spotify_autenticado", "true");

            // Atualizar o contexto de autenticação para refletir o novo estado
            verificarOutrosMetodosAutenticacao();
          } catch (error) {
            console.error("Erro ao obter perfil do usuário:", error);

            // Verificar se é um erro 403 (Permissão negada)
            if (error.message && error.message.includes("403")) {
              setErro(
                "Erro 403: Permissão negada no Spotify. Você precisa aprovar todas as permissões solicitadas para usar este aplicativo."
              );
              // Não redirecionar automaticamente para login, deixar o usuário clicar no botão
            } else {
              // Criar um perfil mínimo para garantir que o usuário possa navegar
              localStorage.setItem(
                "spotify_user_profile",
                JSON.stringify({
                  id: "spotify_user",
                  name: "Usuário Spotify",
                  type: "user",
                })
              );

              // Definir flag para garantir que o app reconheça que foi feito login com Spotify mesmo com erro
              localStorage.setItem("spotify_autenticado", "true");

              // Redirecionar automático só para outros tipos de erro
              setTimeout(() => navigate("/login"), 3000);
            }
          }

          // Definir "feed" como a view ativa
          localStorage.setItem("activeView", "feed");

          // Definir flag para indicar que acabamos de fazer login
          sessionStorage.setItem("login_redirect", "true");

          // Redirecionar para o feed com um refresh completo da página
          setStatus("Autenticação bem-sucedida! Redirecionando...");

          // Usar timeout para permitir que o usuário veja a mensagem de sucesso
          setTimeout(() => {
            // Usar window.location.href para forçar um refresh completo
            window.location.href = "/feed";
          }, 1000);
        } else {
          console.error("Não foi possível obter o token de acesso");
          setErro(
            "Não foi possível obter o token de acesso. O código pode ter expirado ou já foi utilizado."
          );
          setTimeout(() => navigate("/login"), 3000);
        }
      } catch (error) {
        console.error("Erro no processamento do callback:", error);
        setErro("Ocorreu um erro durante a autenticação. Tente novamente.");
        setTimeout(() => navigate("/login"), 3000);
      }
    };

    processarCallback();
  }, [location, navigate, verificarOutrosMetodosAutenticacao]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black p-4">
      <div className="bg-cinza-escuro p-6 rounded-xl w-full max-w-md">
        <h2 className="text-2xl text-verde-claro font-bold mb-6 text-center">
          Autenticação Spotify
        </h2>

        {erro ? (
          <div className="bg-red-900/30 border border-red-500 text-red-200 p-3 rounded-lg mb-4">
            {erro}
            {erro.includes("403") || erro.includes("Permissão") ? (
              <div className="mt-4">
                <p className="text-sm mb-2">
                  Erro de permissão no Spotify. Você precisa aprovar{" "}
                  <strong>todas</strong> as permissões solicitadas:
                </p>
                <ul className="list-disc pl-5 text-sm mb-3">
                  <li>Leia seu perfil de usuário (obrigatório)</li>
                  <li>Leia seu e-mail (obrigatório)</li>
                  <li>Acesse seus artistas mais tocados</li>
                  <li>Acesse seus álbuns salvos</li>
                  <li>Acesse suas playlists privadas</li>
                </ul>
                <p className="text-sm mb-3">
                  Dica: Se você já negou permissões antes, talvez seja
                  necessário removê-las nas configurações do Spotify. Visite:{" "}
                  <a
                    href="https://www.spotify.com/account/apps/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 underline"
                  >
                    Spotify Account Apps
                  </a>
                </p>
                <button
                  onClick={() => (window.location.href = "/login")}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
                >
                  Tentar novamente
                </button>
              </div>
            ) : (
              <p className="mt-2 text-sm">
                Redirecionando para a página de login...
              </p>
            )}
          </div>
        ) : (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-white">{status}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpotifyCallback;
