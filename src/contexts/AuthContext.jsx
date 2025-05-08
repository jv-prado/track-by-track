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
          return userDoc.data();
        } else {
          return null;
        }
      } catch (firestoreError) {
        if (firestoreError.code === "permission-denied") {
          return null;
        }
        return null;
      }
    } catch (error) {
      return null;
    }
  };

  // Função para verificar se o usuário está autenticado via Firebase Auth com token personalizado
  const verificarAutenticacaoPersonalizada = async (usuarioFirebase) => {
    if (!usuarioFirebase) return false;

    try {
      // Verificar se é um usuário autenticado via Spotify (tem o prefixo 'spotify_')
      if (usuarioFirebase.uid.startsWith("spotify_")) {
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
          return false;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  };

  // Função para verificar métodos alternativos de autenticação
  const verificarOutrosMetodosAutenticacao = async () => {
    // Verificar autenticação com Spotify (dados são armazenados na coleção 'usuariosSpotify')
    const refreshToken = localStorage.getItem("spotify_refresh_token");
    const spotifyAutenticado =
      localStorage.getItem("spotify_autenticado") === "true";

    if (refreshToken || spotifyAutenticado) {
      // Primeiro verificar se há um usuário Firebase autenticado por token personalizado
      const usuarioFirebase = getUsuarioAtual();
      if (usuarioFirebase && usuarioFirebase.uid.startsWith("spotify_")) {
        // Se já estiver autenticado via Firebase Auth, não precisamos fazer nada adicional
        const autenticado = await verificarAutenticacaoPersonalizada(
          usuarioFirebase
        );
        if (autenticado) {
          return;
        }
      }

      // Primeiro tentar carregar o perfil do localStorage para ser mais rápido
      try {
        const perfilCached = localStorage.getItem("spotify_user_profile");
        if (perfilCached) {
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
          return;
        }
      } catch (error) {
        return;
      }

      try {
        // Verifica se o token está válido, se não estiver, tenta renová-lo
        let tokenValido = verificarToken();

        if (!tokenValido) {
          tokenValido = await atualizarToken();
        }

        // Só tenta obter o perfil se o token estiver válido
        if (tokenValido) {
          try {
            const perfilSpotify = await obterPerfilUsuario();
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
              // Tenta buscar dados mesmo que o registro falhe
              const dadosFirestore = await buscarDadosUsuarioSpotify(
                perfilSpotify.id
              );
              if (dadosFirestore) {
                setSpotifyUserData(dadosFirestore);
              }
            }
          } catch (apiError) {
            // Se o erro for 403, vamos apenas usar o perfil em cache se disponível
            if (apiError.message && apiError.message.includes("403")) {
              // Não limpar os tokens, apenas evitar a tentativa de obter o perfil
              // O usuário ainda pode navegar nas funcionalidades básicas
              const perfilCached = localStorage.getItem("spotify_user_profile");
              if (perfilCached) {
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
              logoutSpotify();
              setUsuarioSpotify(null);
              setSpotifyUserData(null);
              localStorage.removeItem("spotify_autenticado");
            }
          }
        } else {
          // Se não foi possível renovar o token, limpa dados da sessão Spotify
          logoutSpotify();
          setUsuarioSpotify(null);
          setSpotifyUserData(null);
          localStorage.removeItem("spotify_autenticado");
        }
      } catch (error) {
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

  // Efeito adicional para verificar o Spotify
  useEffect(() => {
    verificarOutrosMetodosAutenticacao();
  }, []);

  // Efeito para verificar se acabamos de fazer login com Spotify
  useEffect(() => {
    const checkSpotifyLogin = () => {
      const loginRedirect = sessionStorage.getItem("login_redirect");
      const spotifyAutenticado = localStorage.getItem("spotify_autenticado");

      if (loginRedirect === "true" && spotifyAutenticado === "true") {
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
      // Se estiver autenticado com Spotify, fazer logout do Spotify
      if (usuarioSpotify) {
        // Usa a função melhorada de logout que limpa todos os dados
        logoutSpotify();
        setUsuarioSpotify(null);
        localStorage.removeItem("activeView");

        // Verificação adicional para garantir que todos os dados do Spotify foram removidos
        const spotifyKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("spotify_")) {
            spotifyKeys.push(key);
          }
        }

        // Remover todos os itens identificados com prefixo "spotify_"
        spotifyKeys.forEach((key) => localStorage.removeItem(key));

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
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  // Calcular se há um usuário ativo (Firebase ou Spotify)
  const usuarioAtivo = !!usuario || !!usuarioSpotify;

  const value = {
    usuario,
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
