import { createContext, useContext, useState, useEffect } from "react";
import {
  observarAutenticacao,
  getUsuarioAtual,
  auth,
} from "../services/firebase";
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
    // Configura o listener para mudanças de autenticação
    const unsubscribe = observarAutenticacao((user) => {
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
            console.log(
              "Usuário de demonstração válido encontrado:",
              usuarioDados.id
            );
            setUsuarioDemo(usuarioDados);
            // Garantir que o modo de demonstração está ativo
            localStorage.setItem("modo_demo_ativo", "true");
          } else {
            // Token expirado, limpar dados demo
            console.log("Token de demonstração expirado, removendo dados");
            localStorage.removeItem("demo_token");
            localStorage.removeItem("demo_token_expiry");
            localStorage.removeItem("demo_usuario");
            localStorage.removeItem("modo_demo_ativo");
            setUsuarioDemo(null);
          }
        } else {
          if (localStorage.getItem("modo_demo_ativo")) {
            console.log(
              "Modo demo ativo mas sem dados de usuário, removendo flag"
            );
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

    // Verificar periodicamente as alterações no localStorage (a cada 500ms)
    // Isso é mais confiável do que o evento storage que só funciona entre janelas diferentes
    const intervalId = setInterval(verificarUsuarioDemo, 500);

    // Atualizar quando o localStorage mudar entre janelas
    window.addEventListener("storage", verificarUsuarioDemo);

    // Limpa o listener quando o componente for desmontado
    return () => {
      unsubscribe();
      clearInterval(intervalId);
      window.removeEventListener("storage", verificarUsuarioDemo);
    };
  }, []);

  // Removido a verificação do token Spotify que não será mais usada

  const valor = {
    usuario,
    usuarioDemo,
    carregando,
    getUsuarioAtual,
    auth,
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
