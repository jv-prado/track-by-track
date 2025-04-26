import { useState, useEffect } from "react";
import "./App.css";
import Sidebar from "./componentes/sidebar/";
import BarraDePesquisa from "./componentes/BarraDePesquisa";
import Feed from "./componentes/Feed/Feed";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import LoginSpotify from "./componentes/LoginSpotify";
import CallbackSpotify from "./componentes/CallbackSpotify";
import DetalhesAlbum from "./componentes/Feed/DetalhesAlbum";
import { isAuthenticated } from "./services/auth";
import PerfilUsuario from "./componentes/PerfilUsuario";
import Splash from "./componentes/Splash";
import {
  configurarSincronizacao,
  carregarAvaliacoesSincronizadas,
} from "./services/sync";

// Componente principal da aplicação
function App() {
  const [activeView, setActiveView] = useState("");
  const [termoPesquisa, setTermoPesquisa] = useState("");
  const [menuAberto, setMenuAberto] = useState(false);
  const [autenticado, setAutenticado] = useState(isAuthenticated());
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearch = (termo) => {
    setTermoPesquisa(termo);
  };

  const toggleMenu = () => {
    setMenuAberto(!menuAberto);
  };

  // Verifica o estado de autenticação ao iniciar
  useEffect(() => {
    const verificarAutenticacao = () => {
      const novoEstado = isAuthenticated();
      setAutenticado(novoEstado);

      // Redirecionar para login se não estiver autenticado e tentando acessar uma rota protegida
      if (
        !novoEstado &&
        location.pathname !== "/" &&
        location.pathname !== "/login" &&
        location.pathname !== "/callback" &&
        location.pathname !== "/splash"
      ) {
        navigate("/login");
      }
    };

    // Verificar autenticação inicialmente
    verificarAutenticacao();

    // Configurar evento para verificar quando o localStorage mudar
    window.addEventListener("storage", verificarAutenticacao);

    // Remover evento ao desmontar
    return () => {
      window.removeEventListener("storage", verificarAutenticacao);
    };
  }, [navigate, location.pathname]);

  // Configurar sincronização de avaliações
  useEffect(() => {
    if (autenticado) {
      // Tentar carregar avaliações sincronizadas
      carregarAvaliacoesSincronizadas();

      // Configurar sincronização de avaliações
      const limparSincronizacao = configurarSincronizacao();

      // Limpar sincronização ao desmontar
      return limparSincronizacao;
    }
  }, [autenticado]);

  // Renderizar splash, login ou callback
  if (location.pathname === "/splash" || location.pathname === "/") {
    return <Splash />;
  }

  if (location.pathname === "/login") {
    return <LoginSpotify />;
  }

  if (location.pathname === "/callback") {
    return <CallbackSpotify />;
  }

  // Layout principal da aplicação
  return (
    <div className="flex flex-col md:flex-row w-full md:w-[90vw] lg:w-[80vw] xl:w-[70vw] 2xl:w-[62vw] mx-auto mt-2 md:mt-10 gap-3 px-2 md:px-0 min-h-screen">
      {/* Menu hamburger para mobile */}
      <button
        className="md:hidden flex items-center justify-center bg-cinza-escuro p-3 rounded-xl mb-2 text-white"
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

      {/* Perfil do usuário no canto superior direito */}
      <div className="fixed top-4 right-4 z-50">
        <PerfilUsuario />
      </div>

      {/* Sidebar - mostrada/escondida em mobile */}
      <div
        className={`${
          menuAberto ? "block" : "hidden"
        } md:block md:sticky md:top-10 md:self-start`}
      >
        <Sidebar
          activeView={activeView}
          setActiveView={(view) => {
            setActiveView(view);
            setMenuAberto(false); // Fecha o menu ao selecionar uma opção
          }}
        />
      </div>

      <div className="flex flex-col w-full gap-4">
        <BarraDePesquisa onSearch={handleSearch} />

        <Routes>
          <Route
            path="/feed"
            element={
              <Feed activeView={activeView} termoPesquisa={termoPesquisa} />
            }
          />
          <Route path="/detalhes/:id" element={<DetalhesAlbum />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
