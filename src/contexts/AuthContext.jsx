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
  registrarUsuarioSpotify,
} from "../services/spotify";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [usuarioDemo, setUsuarioDemo] = useState(null);
  const [usuarioSpotify, setUsuarioSpotify] = useState(null);
  const [spotifyUserData, setSpotifyUserData] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const navigate = useNavigate();
  const db = getFirestore();

  // Função para buscar dados do usuário Spotify do Firestore
  const buscarDadosUsuarioSpotify = async (spotifyId) => {
    if (!spotifyId) return null;

    try {
      // Usar o ID do Spotify diretamente sem o prefixo
      const userId = spotifyId;
      // Buscar na coleção específica para usuários Spotify
      const userRef = doc(db, "usuariosSpotify", userId);

      try {
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          console.log("Dados do usuário Spotify encontrados no Firestore");
          return userDoc.data();
        } else {
          console.log("Nenhum dado do usuário Spotify encontrado no Firestore");
          return null;
        }
      } catch (firestoreError) {
        console.error("Erro ao acessar Firestore:", firestoreError);
        if (firestoreError.code === "permission-denied") {
          console.warn(
            "Permissão negada ao tentar acessar a coleção usuariosSpotify. Verifique as regras de segurança do Firestore."
          );
        }
        return null;
      }
    } catch (error) {
      console.error("Erro ao buscar dados do usuário Spotify:", error);
      return null;
    }
  };

  // Função para verificar se o usuário está autenticado via Firebase Auth com token personalizado
  const verificarAutenticacaoPersonalizada = async (usuarioFirebase) => {
    if (!usuarioFirebase) return false;

    try {
      // Verificar se é um usuário autenticado via Spotify (tem o prefixo 'spotify_')
      if (usuarioFirebase.uid.startsWith("spotify_")) {
        console.log(
          "Usuário autenticado via Firebase Auth com token personalizado do Spotify"
        );

        // Extrair o ID do Spotify do UID do Firebase
        const spotifyId = usuarioFirebase.uid.replace("spotify_", "");

        // Verificar se temos dados de perfil do Spotify no Firestore
        try {
          const dadosSpotify = await buscarDadosUsuarioSpotify(spotifyId);

          if (dadosSpotify) {
            // Definir o usuário Spotify no estado
            setUsuarioSpotify({
              id: spotifyId,
              name:
                dadosSpotify.nome ||
                usuarioFirebase.displayName ||
                "Usuário Spotify",
              email: dadosSpotify.email || usuarioFirebase.email,
              imageUrl: dadosSpotify.foto_perfil || usuarioFirebase.photoURL,
            });

            // Definir os dados do usuário Spotify no estado
            setSpotifyUserData(dadosSpotify);

            return true;
          }
        } catch (error) {
          console.error("Erro ao buscar dados do usuário Spotify:", error);
        }
      }

      return false;
    } catch (error) {
      console.error("Erro ao verificar autenticação personalizada:", error);
      return false;
    }
  };

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

    // Verificar autenticação com Spotify (dados são armazenados na coleção 'usuariosSpotify')
    const refreshToken = localStorage.getItem("spotify_refresh_token");
    const spotifyAutenticado =
      localStorage.getItem("spotify_autenticado") === "true";

    if (refreshToken || spotifyAutenticado) {
      console.log(
        "Refresh token ou flag de autenticação do Spotify encontrada"
      );

      // Primeiro verificar se há um usuário Firebase autenticado por token personalizado
      const usuarioFirebase = getUsuarioAtual();
      if (usuarioFirebase && usuarioFirebase.uid.startsWith("spotify_")) {
        console.log(
          "Usuário Spotify autenticado via Firebase Auth detectado:",
          usuarioFirebase.uid
        );

        // Se já estiver autenticado via Firebase Auth, não precisamos fazer nada adicional
        const autenticado = await verificarAutenticacaoPersonalizada(
          usuarioFirebase
        );
        if (autenticado) {
          console.log("Autenticação personalizada verificada com sucesso");
          return;
        }
      }

      // Primeiro tentar carregar o perfil do localStorage para ser mais rápido
      try {
        const perfilCached = localStorage.getItem("spotify_user_profile");
        if (perfilCached) {
          console.log("Usando perfil do Spotify em cache");
          const perfil = JSON.parse(perfilCached);
          setUsuarioSpotify(perfil);

          // Buscar dados do usuário da coleção 'usuariosSpotify'
          if (perfil.id) {
            const dadosFirestore = await buscarDadosUsuarioSpotify(perfil.id);
            if (dadosFirestore) {
              setSpotifyUserData(dadosFirestore);
            }
          }

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

            // Registrar/atualizar usuário no Firestore (coleção 'usuariosSpotify') e obter dados
            try {
              const userData = await registrarUsuarioSpotify(perfilSpotify);
              if (userData) {
                setSpotifyUserData(userData);
              }
            } catch (registroError) {
              console.error(
                "Erro ao registrar/atualizar usuário Spotify na coleção 'usuariosSpotify':",
                registroError
              );

              // Tenta buscar dados mesmo que o registro falhe
              const dadosFirestore = await buscarDadosUsuarioSpotify(
                perfilSpotify.id
              );
              if (dadosFirestore) {
                setSpotifyUserData(dadosFirestore);
              }
            }
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
                  const perfil = JSON.parse(perfilCached);
                  setUsuarioSpotify(perfil);

                  // Buscar dados do usuário da coleção 'usuariosSpotify'
                  if (perfil.id) {
                    const dadosFirestore = await buscarDadosUsuarioSpotify(
                      perfil.id
                    );
                    if (dadosFirestore) {
                      setSpotifyUserData(dadosFirestore);
                    }
                  }
                } catch (e) {
                  console.error("Erro ao processar cache após 403:", e);
                  setUsuarioSpotify(null);
                  setSpotifyUserData(null);
                }
              } else {
                // Se não temos perfil em cache, criamos um perfil mínimo
                setUsuarioSpotify({
                  display_name: "Usuário Spotify",
                  id: "spotify_user",
                  type: "user",
                });
                setSpotifyUserData(null);
              }
            } else {
              // Para outros erros, limpamos os tokens
              console.error("Erro não relacionado a permissão (não é 403)");
              logoutSpotify();
              setUsuarioSpotify(null);
              setSpotifyUserData(null);
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
          setSpotifyUserData(null);
          localStorage.removeItem("spotify_autenticado");
        }
      } catch (error) {
        console.error("Erro geral ao carregar perfil do Spotify:", error);
        // Em caso de erro na API, limpa os dados da sessão para evitar ciclos de erro
        logoutSpotify();
        setUsuarioSpotify(null);
        setSpotifyUserData(null);
        localStorage.removeItem("spotify_autenticado");
      }
    } else {
      setUsuarioSpotify(null);
      setSpotifyUserData(null);
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

        // Verificar se é um usuário Spotify (autenticado via token personalizado)
        if (user.uid.startsWith("spotify_")) {
          console.log("Detectado usuário Spotify via Firebase Auth:", user.uid);
          verificarAutenticacaoPersonalizada(user).then((autenticado) => {
            if (!autenticado) {
              setUsuario(dadosUsuario); // Fallback para usuário normal se não conseguir carregar dados Spotify
            }
            setCarregando(false);
          });
        } else {
          // Usuário Firebase normal
          setUsuario(dadosUsuario);
          setCarregando(false);
        }
      } else {
        setUsuario(null);
        verificarOutrosMetodosAutenticacao();
        setCarregando(false);
      }
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

        // Se também estiver autenticado no Firebase, deslogar de lá também
        const usuarioFirebase = getUsuarioAtual();
        if (usuarioFirebase && usuarioFirebase.uid.startsWith("spotify_")) {
          await logout();
        }
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
    spotifyUserData,
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
