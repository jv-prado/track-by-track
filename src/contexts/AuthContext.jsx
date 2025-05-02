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

  // Função para verificar métodos alternativos de autenticação
  const verificarOutrosMetodosAutenticacao = async () => {
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

    // Verificar autenticação com Spotify - verifica primeiro se o token está presente e tenta atualizar se necessário
    const refreshToken = localStorage.getItem("spotify_refresh_token");

    if (refreshToken) {
      try {
        // Verifica se o token está válido, se não estiver, tenta renová-lo
        let tokenValido = verificarToken();

        if (!tokenValido) {
          tokenValido = await atualizarToken();
        }

        // Só tenta obter o perfil se o token estiver válido
        if (tokenValido) {
          const perfilSpotify = await obterPerfilUsuario();
          setUsuarioSpotify(perfilSpotify);
        } else {
          // Se não foi possível renovar o token, limpa dados da sessão Spotify
          logoutSpotify();
          setUsuarioSpotify(null);
        }
      } catch (error) {
        console.error("Erro ao carregar perfil do Spotify:", error);
        // Em caso de erro na API, limpa os dados da sessão para evitar ciclos de erro
        logoutSpotify();
        setUsuarioSpotify(null);
      }
    } else {
      setUsuarioSpotify(null);
    }
  };

  // Efeito adicional para verificar o modo demo e Spotify
  useEffect(() => {
    verificarOutrosMetodosAutenticacao();
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

  const value = {
    usuario,
    usuarioDemo,
    usuarioSpotify,
    carregando,
    fazerLogout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!carregando && children}
    </AuthContext.Provider>
  );
}
