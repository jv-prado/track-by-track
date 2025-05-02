import React, { createContext, useContext, useState, useEffect } from "react";
import {
  observarAutenticacao,
  getUsuarioAtual,
  fazerLogout as logout,
  auth,
} from "../services/firebase/index";
import { logInfoAutenticacao } from "../services/firebase/auth-helper";
import { useNavigate } from "react-router-dom";
import {
  estaAutenticado,
  obterPerfilUsuario,
  logout as logoutSpotify,
  verificarToken,
  atualizarToken,
} from "../services/spotify";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [usuarioDemo, setUsuarioDemo] = useState(null);
  const [usuarioSpotify, setUsuarioSpotify] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const navigate = useNavigate();

  // Função para verificar métodos alternativos de autenticação
  const verificarOutrosMetodosAutenticacao = async () => {
    console.log("Verificando métodos alternativos de autenticação");

    // Verificar modo demo
    const demoToken = localStorage.getItem("demo_token");
    const demoExpiry = localStorage.getItem("demo_token_expiry");
    const modoDemo =
      demoToken && demoExpiry && parseInt(demoExpiry) > Date.now();

    if (modoDemo) {
      try {
        const usuarioDemo = JSON.parse(
          localStorage.getItem("demo_usuario") || "{}"
        );
        setUsuarioDemo(usuarioDemo);
      } catch (error) {
        console.error("Erro ao carregar usuário demo:", error);
        setUsuarioDemo(null);
      }
    } else {
      setUsuarioDemo(null);
    }

    // Verificar autenticação com Spotify
    const refreshToken = localStorage.getItem("spotify_refresh_token");
    const spotifyAutenticado =
      localStorage.getItem("spotify_autenticado") === "true";

    if (refreshToken || spotifyAutenticado) {
      console.log(
        "Refresh token ou flag de autenticação do Spotify encontrada"
      );

      // Primeiro tentar carregar o perfil do localStorage para ser mais rápido
      try {
        const perfilCached = localStorage.getItem("spotify_user_profile");
        if (perfilCached) {
          console.log("Usando perfil do Spotify em cache");
          setUsuarioSpotify(JSON.parse(perfilCached));

          // Se já temos um perfil em cache, isso é suficiente para considerar o usuário autenticado
          // Não precisamos fazer chamada à API neste momento
          console.log(
            "Usando perfil em cache sem verificar na API para evitar erro 403"
          );
          return;
        }
      } catch (error) {
        console.error("Erro ao ler perfil do Spotify em cache:", error);
      }

      try {
        // Verifica se o token está válido, se não estiver, tenta renová-lo
        let tokenValido = verificarToken();
        console.log(
          "Status do token atual:",
          tokenValido ? "Válido" : "Inválido ou expirado"
        );

        if (!tokenValido) {
          console.log("Token expirado, tentando renovar...");
          tokenValido = await atualizarToken();
          console.log(
            "Renovação do token:",
            tokenValido ? "Bem-sucedida" : "Falhou"
          );
        }

        // Só tenta obter o perfil se o token estiver válido
        if (tokenValido) {
          console.log("Obtendo perfil atualizado do Spotify");
          try {
            const perfilSpotify = await obterPerfilUsuario();
            console.log(
              "Perfil obtido com sucesso:",
              perfilSpotify?.display_name
            );
            setUsuarioSpotify(perfilSpotify);

            // Atualizar o cache
            localStorage.setItem(
              "spotify_user_profile",
              JSON.stringify({
                id: perfilSpotify.id,
                name: perfilSpotify.display_name,
                email: perfilSpotify.email,
                imageUrl: perfilSpotify.images?.[0]?.url || null,
              })
            );
          } catch (apiError) {
            console.error(
              "Erro ao obter perfil (possível erro 403):",
              apiError
            );

            // Se o erro for 403, vamos apenas usar o perfil em cache se disponível
            if (apiError.message && apiError.message.includes("403")) {
              console.log(
                "Erro 403 detectado - permissão negada pela API do Spotify"
              );

              // Não limpar os tokens, apenas evitar a tentativa de obter o perfil
              // O usuário ainda pode navegar nas funcionalidades básicas
              const perfilCached = localStorage.getItem("spotify_user_profile");
              if (perfilCached) {
                console.log("Usando perfil em cache após erro 403");
                try {
                  setUsuarioSpotify(JSON.parse(perfilCached));
                } catch (e) {
                  console.error("Erro ao processar cache após 403:", e);
                  setUsuarioSpotify(null);
                }
              } else {
                // Se não temos perfil em cache, criamos um perfil mínimo
                setUsuarioSpotify({
                  display_name: "Usuário Spotify",
                  id: "spotify_user",
                  type: "user",
                });
              }
            } else {
              // Para outros erros, limpamos os tokens
              console.error("Erro não relacionado a permissão (não é 403)");
              logoutSpotify();
              setUsuarioSpotify(null);
              localStorage.removeItem("spotify_autenticado");
            }
          }
        } else {
          // Se não foi possível renovar o token, limpa dados da sessão Spotify
          console.log(
            "Não foi possível renovar o token, fazendo logout do Spotify"
          );
          logoutSpotify();
          setUsuarioSpotify(null);
          localStorage.removeItem("spotify_autenticado");
        }
      } catch (error) {
        console.error("Erro geral ao carregar perfil do Spotify:", error);
        // Em caso de erro na API, limpa os dados da sessão para evitar ciclos de erro
        logoutSpotify();
        setUsuarioSpotify(null);
        localStorage.removeItem("spotify_autenticado");
      }
    } else {
      setUsuarioSpotify(null);
    }
  };

  useEffect(() => {
    const unsubscribe = observarAutenticacao((user) => {
      if (user) {
        const dadosUsuario = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        };
        setUsuario(dadosUsuario);
      } else {
        setUsuario(null);
        verificarOutrosMetodosAutenticacao();
      }
      setCarregando(false);
    });

    return unsubscribe;
  }, []);

  // Efeito adicional para verificar o modo demo e Spotify
  useEffect(() => {
    verificarOutrosMetodosAutenticacao();
  }, []);

  // Efeito para verificar se acabamos de fazer login com Spotify
  useEffect(() => {
    const checkSpotifyLogin = () => {
      const loginRedirect = sessionStorage.getItem("login_redirect");
      const spotifyAutenticado = localStorage.getItem("spotify_autenticado");

      if (loginRedirect === "true" && spotifyAutenticado === "true") {
        console.log(
          "Detectado login recente com Spotify, verificando autenticação"
        );
        verificarOutrosMetodosAutenticacao();
      }
    };

    checkSpotifyLogin();

    // Verificar novamente se houver mudança de URL
    window.addEventListener("popstate", checkSpotifyLogin);
    return () => window.removeEventListener("popstate", checkSpotifyLogin);
  }, []);

  // Função de logout
  const fazerLogout = async () => {
    try {
      // Se estiver em modo demo, limpar dados do demo
      if (usuarioDemo) {
        localStorage.removeItem("demo_token");
        localStorage.removeItem("demo_token_expiry");
        localStorage.removeItem("demo_usuario");
        localStorage.removeItem("modo_demo_ativo");
        localStorage.removeItem("activeView");

        // Limpar dados de avaliações do modo demo
        localStorage.setItem("avaliacoesFaixas", JSON.stringify({}));
        localStorage.setItem("mapaFaixasAlbuns", JSON.stringify({}));
        localStorage.setItem("datasAvaliacoes", JSON.stringify({}));

        setUsuarioDemo(null);
      }
      // Se estiver autenticado com Spotify, fazer logout do Spotify
      else if (usuarioSpotify) {
        logoutSpotify();
        setUsuarioSpotify(null);
        localStorage.removeItem("spotify_autenticado");
      }
      // Caso contrário, deslogar normalmente do Firebase
      else if (usuario) {
        await logout();
      }

      // Limpar dados de sessão
      localStorage.removeItem("activeView");

      // Redirecionar para a tela de login
      navigate("/login");

      return true;
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      return false;
    }
  };

  // Calcular se há um usuário ativo (Firebase, Spotify ou Demo)
  const usuarioAtivo = !!usuario || !!usuarioDemo || !!usuarioSpotify;

  const value = {
    usuario,
    usuarioDemo,
    usuarioSpotify,
    usuarioAtivo,
    carregando,
    fazerLogout,
    verificarOutrosMetodosAutenticacao,
  };

  return (
    <AuthContext.Provider value={value}>
      {!carregando && children}
    </AuthContext.Provider>
  );
}
