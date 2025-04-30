import { createContext, useContext, useState, useEffect } from "react";
import {
  observarAutenticacao,
  getUsuarioAtual,
  fazerLogout,
  auth,
} from "../services/firebase/index";
import { logInfoAutenticacao } from "../services/firebase/auth-helper";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [usuarioDemo, setUsuarioDemo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    console.log(
      "AuthContext: Inicializando e configurando observadores de autenticação"
    );

    // Verificar o estado atual de autenticação ao iniciar
    const usuarioAtual = auth.currentUser;
    if (usuarioAtual) {
      console.log("AuthContext: Usuário já autenticado:", usuarioAtual.email);
      setUsuario(usuarioAtual);
    }

    // Log de informações sobre a autenticação atual (para depuração)
    logInfoAutenticacao().then((user) => {
      if (user) {
        console.log(
          "AuthContext: Autenticação verificada via helper:",
          user.email
        );
      }
    });

    // Configura o listener para mudanças de autenticação
    const unsubscribe = observarAutenticacao((user) => {
      console.log(
        "AuthContext: Mudança na autenticação detectada:",
        user ? user.email : "Nenhum usuário"
      );
      setUsuario(user);
      setCarregando(false);
    });

    // Verificar se existe um usuário de demonstração
    const verificarUsuarioDemo = () => {
      try {
        const demoToken = localStorage.getItem("demo_token");
        const demoExpiry = localStorage.getItem("demo_token_expiry");
        const demoUsuario = localStorage.getItem("demo_usuario");

        if (demoToken && demoExpiry && demoUsuario) {
          // Verificar se o token demo não expirou
          if (parseInt(demoExpiry) > Date.now()) {
            const usuarioDados = JSON.parse(demoUsuario);
            setUsuarioDemo(usuarioDados);
            // Garantir que o modo de demonstração está ativo
            localStorage.setItem("modo_demo_ativo", "true");
          } else {
            // Token expirado, limpar dados demo
            localStorage.removeItem("demo_token");
            localStorage.removeItem("demo_token_expiry");
            localStorage.removeItem("demo_usuario");
            localStorage.removeItem("modo_demo_ativo");
            setUsuarioDemo(null);
          }
        } else {
          if (localStorage.getItem("modo_demo_ativo")) {
            localStorage.removeItem("modo_demo_ativo");
          }
          setUsuarioDemo(null);
        }
      } catch (error) {
        console.error("Erro ao verificar usuário demo:", error);
        setUsuarioDemo(null);
      }
    };

    verificarUsuarioDemo();

    // Atualizar quando o localStorage mudar entre janelas
    window.addEventListener("storage", verificarUsuarioDemo);

    // Limpa o listener quando o componente for desmontado
    return () => {
      console.log("AuthContext: Desmontando e removendo observadores");
      unsubscribe();
      window.removeEventListener("storage", verificarUsuarioDemo);
    };
  }, []);

  // Se o usuário mudar, logar informações para depuração
  useEffect(() => {
    if (usuario) {
      console.log("AuthContext: Usuário atualizado:", usuario.email);
    }
  }, [usuario]);

  const valor = {
    usuario,
    usuarioDemo,
    carregando,
    getUsuarioAtual,
    fazerLogout,
    // Helper para verificar se há qualquer usuário válido (Firebase ou Demo)
    get usuarioAtivo() {
      return usuario || usuarioDemo;
    },
    // Helper para verificar se está no modo de demonstração
    get modoDemo() {
      return !!usuarioDemo;
    },
  };

  return (
    <AuthContext.Provider value={valor}>
      {!carregando && children}
    </AuthContext.Provider>
  );
}
