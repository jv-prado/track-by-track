import { useState, useEffect } from "react";
import "./App.css";
import Sidebar from "./componentes/sidebar/";
import BarraDePesquisa from "./componentes/BarraDePesquisa";
import Feed from "./componentes/Feed/Feed";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import PerfilUsuario from "./componentes/PerfilUsuario";
import Splash from "./componentes/Splash";
import Login from "./componentes/AuthForms/Login";
import Registro from "./componentes/AuthForms/Registro";
import { useAuth } from "./contexts/AuthContext";
import {
  configurarSincronizacao,
  carregarAvaliacoesSincronizadas,
} from "./services/sync";
import { migrarDadosAvaliacoes } from "./services/avaliacoes";
import { App as CapApp } from "@capacitor/app";
import LanguageSelector from "./componentes/LanguageSelector";

// Componente principal da aplicação
function App() {
  const [activeView, setActiveView] = useState("");
  const [termoPesquisa, setTermoPesquisa] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario: usuarioFirebase } = useAuth();

  // Lidar com o botão voltar usando o plugin oficial do Capacitor
  useEffect(() => {
    const setupBackButton = async () => {
      // Registrar listener para o evento de botão voltar do hardware
      CapApp.addListener("backButton", () => {
        // Se estivermos em uma página diferente da principal, voltar para a anterior
        if (
          location.pathname !== "/feed" &&
          location.pathname !== "/login" &&
          location.pathname !== "/registro" &&
          location.pathname !== "/splash"
        ) {
          navigate(-1);
        } else if (location.pathname === "/feed") {
          // No feed principal, não fazer nada ou mostrar diálogo de confirmação
          console.log("No feed principal, não navegando para trás");
          // Opcional: mostrar diálogo perguntando se deseja sair
          // CapApp.exitApp(); // Para sair do app
        }
      });
    };

    setupBackButton();

    return () => {
      // Limpar o listener ao desmontar
      CapApp.removeAllListeners();
    };
  }, [navigate, location.pathname]);

  // Carregar a view ativa do localStorage se disponível
  useEffect(() => {
    const savedView = localStorage.getItem("activeView");
    if (savedView) {
      setActiveView(savedView);
    }
  }, []);

  const handleSearch = (termo) => {
    setTermoPesquisa(termo);
  };

  // Verifica o estado de autenticação ao iniciar
  useEffect(() => {
    const verificarAutenticacao = () => {
      // Redirecionar para login se não estiver autenticado e tentando acessar uma rota protegida
      const demoToken = localStorage.getItem("demo_token");
      const demoExpiry = localStorage.getItem("demo_token_expiry");
      const modoDemo =
        demoToken && demoExpiry && parseInt(demoExpiry) > Date.now();

      if (
        !usuarioFirebase &&
        !modoDemo && // Verificar autenticação Firebase ou Demo
        location.pathname !== "/" &&
        location.pathname !== "/login" &&
        location.pathname !== "/registro" &&
        location.pathname !== "/splash"
      ) {
        navigate("/login");
      }
    };

    // Verificar autenticação inicialmente
    verificarAutenticacao();

    // Executar migração de dados para registrar datas de avaliações antigas
    migrarDadosAvaliacoes();

    // Verificar autenticação a cada 2 minutos para detectar expiração do token
    const intervaloVerificacao = setInterval(() => {
      verificarAutenticacao();
    }, 2 * 60 * 1000);

    // Remover eventos ao desmontar
    return () => {
      clearInterval(intervaloVerificacao);
    };
  }, [navigate, location.pathname, usuarioFirebase]);

  // Configurar sincronização de avaliações
  useEffect(() => {
    if (usuarioFirebase) {
      // Tentar carregar avaliações sincronizadas
      carregarAvaliacoesSincronizadas();

      // Configurar sincronização de avaliações
      const limparSincronizacao = configurarSincronizacao();

      // Verificar se acabamos de fazer login
      const origemLogin = sessionStorage.getItem("login_redirect");
      if (origemLogin === "true") {
        // Limpar a flag de redirecionamento
        sessionStorage.removeItem("login_redirect");

        // Forçar navegação para feed e atualizar activeView
        setActiveView("feed");
        localStorage.setItem("activeView", "feed");
        navigate("/feed", { replace: true });
      }
      // Se o usuário acabou de fazer login e está na página de feed, mas não tem activeView
      else if (location.pathname === "/feed" && !activeView) {
        setActiveView("feed");
        localStorage.setItem("activeView", "feed");
      }

      // Limpar sincronização ao desmontar
      return limparSincronizacao;
    }
  }, [usuarioFirebase, location.pathname, activeView, navigate]);

  // Renderizar o seletor de idioma apenas para desktop
  const renderLanguageSelector = () => {
    // Verifica se a tela é mobile (via CSS media query)
    const isMobile = window.matchMedia("(max-width: 768px)").matches;

    // No mobile, o seletor de idiomas já está no menu hamburguer
    if (isMobile) {
      return null;
    }

    // Em desktop, mostrar o seletor flutuante
    return <LanguageSelector />;
  };

  // Renderizar splash, login ou callback
  if (location.pathname === "/splash" || location.pathname === "/") {
    return (
      <>
        <Splash />
      </>
    );
  }

  if (location.pathname === "/login") {
    return (
      <>
        <Login />
        {renderLanguageSelector()}
      </>
    );
  }

  if (location.pathname === "/registro") {
    return (
      <>
        <Registro />
        {renderLanguageSelector()}
      </>
    );
  }

  // Função para gerenciar a mudança de visão
  const handleViewChange = (view) => {
    // Se a mesma visão for clicada novamente, limpar o termo de pesquisa
    if (view === activeView) {
      setTermoPesquisa("");
    }

    // Salvar a view ativa no localStorage
    localStorage.setItem("activeView", view);

    setActiveView(view);

    // Garantir que estamos na rota /feed
    if (location.pathname !== "/feed") {
      navigate("/feed");
    }
  };

  // Layout principal da aplicação
  return (
    <>
      <div className="flex flex-col lg:flex-row w-full lg:w-[90vw] xl:w-[85vw] 2xl:w-[90vw] 3xl:w-[1440px] mx-auto m-2 mt-4 lg:mt-12 gap-3 px-2 lg:px-0 content-area">
        {/* Sidebar sempre visível em desktop (acima de 1000px), escondida em telas menores */}
        <div className="lg:sticky lg:top-10 lg:self-start">
          <Sidebar activeView={activeView} setActiveView={handleViewChange} />
        </div>

        <div className="flex flex-col w-full">
          {/* Barra de pesquisa com posição sticky e z-index alto */}
          <div className="sticky top-10 z-100 flex items-center">
            <div className="flex-grow">
              <BarraDePesquisa
                onSearch={handleSearch}
                activeView={activeView}
                termoPesquisa={termoPesquisa}
              />
            </div>
          </div>
          {/* Conteúdo do feed sem barra de rolagem, com espaço para a bottom nav em telas abaixo de 1000px */}
          <div
            className="overflow-auto mt-4 mb-safe pb-16 lg:pb-0"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: " #81fe88 #2C2C2C",
              height: "calc(var(--app-height) - 80px)",
              paddingBottom: "calc(var(--safe-area-inset-bottom) + 60px)",
            }}
          >
            <Routes>
              <Route
                path="/feed"
                element={
                  <Feed activeView="feed" termoPesquisa={termoPesquisa} />
                }
              />
              <Route
                path="/albuns"
                element={
                  <Feed activeView="albuns" termoPesquisa={termoPesquisa} />
                }
              />
              <Route
                path="/artistas"
                element={
                  <Feed activeView="artistas" termoPesquisa={termoPesquisa} />
                }
              />
              <Route
                path="/minhas-avaliacoes"
                element={
                  <Feed
                    activeView="classificacoes"
                    termoPesquisa={termoPesquisa}
                  />
                }
              />
              <Route path="/login" element={<Login />} />
              <Route path="/registro" element={<Registro />} />
              <Route path="/album/:id" element={<Feed activeView="album" />} />
            </Routes>
          </div>
        </div>

        {/* Perfil do usuário no canto superior direito - visível apenas em telas acima de 1000px */}
        <div className="hidden lg:block lg:sticky lg:top-10 lg:self-start z-40">
          <div className="mb-4 sticky top-10">
            <PerfilUsuario />
          </div>
        </div>
      </div>

      {/* Seletor de idioma */}
      {renderLanguageSelector()}
    </>
  );
}

export default App;
