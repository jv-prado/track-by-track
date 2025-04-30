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
import { fazerLogout } from "./services/firebase";
import {
  configurarSincronizacao,
  carregarAvaliacoesSincronizadas,
} from "./services/sync";
import { migrarDadosAvaliacoes } from "./services/avaliacoes";
import { App as CapApp } from "@capacitor/app";
import { useTranslation } from "react-i18next";
import LanguageSelector from "./componentes/LanguageSelector";

// Componente principal da aplicação
function App() {
  const [activeView, setActiveView] = useState("");
  const [termoPesquisa, setTermoPesquisa] = useState("");
  const [menuAberto, setMenuAberto] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario: usuarioFirebase } = useAuth();
  const { t } = useTranslation();

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

  const toggleMenu = () => {
    setMenuAberto(!menuAberto);
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

      // Se o usuário acabou de fazer login e está na página de feed, mas não tem activeView
      if (location.pathname === "/feed" && !activeView) {
        setActiveView("feed");
        localStorage.setItem("activeView", "feed");
      }

      // Limpar sincronização ao desmontar
      return limparSincronizacao;
    }
  }, [usuarioFirebase, location.pathname, activeView]);

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
    setMenuAberto(false); // Fecha o menu ao selecionar uma opção

    // Garantir que estamos na rota /feed
    if (location.pathname !== "/feed") {
      navigate("/feed");
    }
  };

  // Layout principal da aplicação
  return (
    <>
      <div className="flex flex-col md:flex-row w-full md:w-[90vw] lg:w-[85vw] xl:w-[90vw] 2xl:w-[1440px] mx-auto m-2 mt-4 md:mt-12 gap-3 px-2 md:px-0 content-area">
        {/* Menu hamburger para mobile */}
        <button
          className="md:hidden flex items-center justify-center bg-cinza-escuro p-3 rounded-xl mb-2 text-white cursor-pointer"
          onClick={toggleMenu}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
          <span className="ml-2">{t("app.menu")}</span>
        </button>

        {/* Sidebar - mostrada/escondida em mobile */}
        <div
          className={`${
            menuAberto ? "block" : "hidden"
          } md:block md:sticky md:top-10 md:self-start`}
        >
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

            {/* Botão de logout para mobile */}
            <button
              onClick={() => {
                // Fazer logout
                if (usuarioFirebase) {
                  fazerLogout().then(() => {
                    navigate("/login");
                  });
                } else {
                  navigate("/login");
                }
              }}
              className="md:hidden ml-2 bg-cinza-escuro text-white p-2 rounded-lg cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
          {/* Conteúdo do feed sem barra de rolagem */}
          <div
            className="overflow-auto mt-4 mb-safe"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: " #81fe88 #2C2C2C",
              height: "calc(var(--app-height) - 80px)",
              paddingBottom: "var(--safe-area-inset-bottom)",
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

        {/* Perfil do usuário no canto superior direito - agora sticky */}
        <div className="hidden md:block md:sticky md:top-10 md:self-start z-40">
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
