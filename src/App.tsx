import { useState, useEffect } from "react";
import "./App.css";
import Sidebar from "./componentes/Sidebar/";
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

// Componente principal da aplicação
function App() {
  const [activeView, setActiveView] = useState("");
  const [termoPesquisa, setTermoPesquisa] = useState("");
  const [menuAberto, setMenuAberto] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario: usuarioFirebase } = useAuth();

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

      // Limpar sincronização ao desmontar
      return limparSincronizacao;
    }
  }, [usuarioFirebase]);

  // Renderizar splash, login ou callback
  if (location.pathname === "/splash" || location.pathname === "/") {
    return <Splash />;
  }

  if (location.pathname === "/login") {
    return <Login />;
  }

  if (location.pathname === "/registro") {
    return <Registro />;
  }

  // Função para gerenciar a mudança de visão
  const handleViewChange = (view) => {
    console.log(
      `handleViewChange chamada. View atual: ${activeView}, nova view: ${view}`
    );

    // Se a mesma visão for clicada novamente, limpar o termo de pesquisa
    if (view === activeView) {
      console.log(`Mesmo item clicado novamente. Limpando termo de pesquisa.`);
      setTermoPesquisa("");
    }

    setActiveView(view);
    setMenuAberto(false); // Fecha o menu ao selecionar uma opção

    // Garantir que estamos na rota /feed
    if (location.pathname !== "/feed") {
      console.log(`Navegando para /feed. Rota atual: ${location.pathname}`);
      navigate("/feed");
    }
  };

  // Layout principal da aplicação
  return (
    <div className="flex flex-col md:flex-row w-full md:w-[90vw] lg:w-[80vw] xl:w-[70vw] 2xl:w-[1440px] mx-auto m-2 mt-4 md:mt-12 gap-3 px-2 md:px-0 ">
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
        <span className="ml-2">Menu</span>
      </button>

      {/* Sidebar - mostrada/escondida em mobile */}
      <div
        className={`${
          menuAberto ? "block" : "hidden"
        } md:block md:sticky md:top-10 md:self-start`}
      >
        <Sidebar activeView={activeView} setActiveView={handleViewChange} />
      </div>

      <div className="flex flex-col w-full ">
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
          className="overflow-auto h-[calc(100vh-160px)] mt-4 "
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: " #81fe88 #2C2C2C",
          }}
        >
          <Routes>
            <Route
              path="/feed"
              element={
                <Feed activeView={activeView} termoPesquisa={termoPesquisa} />
              }
            />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} />
          </Routes>
        </div>
      </div>

      {/* Perfil do usuário no canto superior direito - agora sticky */}
      <div className="hidden md:block md:sticky md:top-10 md:self-start z-40 ">
        <div className="mb-4  sticky top-10 ">
          <PerfilUsuario />
        </div>
      </div>
    </div>
  );
}

export default App;
