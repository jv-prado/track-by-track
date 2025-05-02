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
import SpotifyCallback from "./componentes/SpotifyCallback";
import { useAuth } from "./contexts/AuthContext";
import {
  configurarSincronizacao,
  carregarAvaliacoesSincronizadas,
} from "./services/sync";
import { migrarDadosAvaliacoes } from "./services/avaliacoes";
import { App as CapApp } from "@capacitor/app";
import LanguageSelector from "./componentes/LanguageSelector";
import PoliticaDePrivacidade from "./componentes/PoliticaDePrivacidade";
import TermosDeUso from "./componentes/TermosDeUso";
import ExclusaoDeConta from "./componentes/ExclusaoDeConta";
import { auth } from "./services/firebase";
import { logInfoAutenticacao } from "./services/firebase/auth-helper";
import { diagnosticarProblemasAutenticacao } from "./services/debug";
import { estaAutenticado } from "./services/spotify";

// Componente principal da aplicação
function App() {
  const [activeView, setActiveView] = useState("");
  const [termoPesquisa, setTermoPesquisa] = useState("");
  const [carregandoAuth, setCarregandoAuth] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario: usuarioFirebase, usuarioDemo } = useAuth();
  const [usuarioSpotify, setUsuarioSpotify] = useState(estaAutenticado());

  // Verificar a autenticação ao iniciar o aplicativo
  useEffect(() => {
    const verificarPersistenciaAuth = async () => {
      setCarregandoAuth(true);

      // Verificar se o usuário está autenticado pelo Spotify
      const spotifyAutenticado =
        localStorage.getItem("spotify_autenticado") === "true";
      const tokenSpotify = localStorage.getItem("spotify_access_token");
      const refreshTokenSpotify = localStorage.getItem("spotify_refresh_token");

      if (spotifyAutenticado || tokenSpotify || refreshTokenSpotify) {
        console.log("Usuário autenticado pelo Spotify detectado");
        setUsuarioSpotify(true);

        if (location.pathname === "/" || location.pathname === "/splash") {
          setActiveView("feed");
          localStorage.setItem("activeView", "feed");
          navigate("/feed", { replace: true });
        }
        setCarregandoAuth(false);
        return;
      }

      // Verificar se há um usuário autenticado usando o objeto auth
      const currentUser = auth.currentUser;
      if (currentUser) {
        // Se estiver na página inicial ou splash e o usuário já estiver logado,
        // redirecionar diretamente para o feed
        if (location.pathname === "/" || location.pathname === "/splash") {
          setActiveView("feed");
          localStorage.setItem("activeView", "feed");
          navigate("/feed", { replace: true });
        }
      } else {
        // Verificar através do helper
        const userFromHelper = await logInfoAutenticacao();
        if (userFromHelper) {
          // Também redirecionar se o usuário for encontrado pelo helper
          if (location.pathname === "/" || location.pathname === "/splash") {
            setActiveView("feed");
            localStorage.setItem("activeView", "feed");
            navigate("/feed", { replace: true });
          }
        } else {
          await diagnosticarProblemasAutenticacao();
        }
      }

      setCarregandoAuth(false);
    };

    verificarPersistenciaAuth();
  }, [navigate, location.pathname]);

  // Verificar se há um usuário demo ou Spotify que também deveria pular a splashscreen
  useEffect(() => {
    // Verificar se tem um usuário demo ativo
    const demoToken = localStorage.getItem("demo_token");
    const demoExpiry = localStorage.getItem("demo_token_expiry");
    const modoDemo =
      demoToken && demoExpiry && parseInt(demoExpiry) > Date.now();

    // Verificar se tem um usuário Spotify ativo
    const autenticadoSpotify = estaAutenticado();
    setUsuarioSpotify(autenticadoSpotify);

    if (
      (modoDemo || autenticadoSpotify) &&
      (location.pathname === "/" || location.pathname === "/splash")
    ) {
      setActiveView("feed");
      localStorage.setItem("activeView", "feed");
      navigate("/feed", { replace: true });
    }
  }, [navigate, location.pathname]);

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

      // Verificar autenticação Spotify
      const autenticadoSpotify = estaAutenticado();
      setUsuarioSpotify(autenticadoSpotify);

      // Se o usuário estiver na página inicial ou splash e já estiver autenticado (Firebase, Demo ou Spotify),
      // redirecionar para o feed
      if (
        (location.pathname === "/" || location.pathname === "/splash") &&
        (usuarioFirebase || modoDemo || autenticadoSpotify)
      ) {
        setActiveView("feed");
        localStorage.setItem("activeView", "feed");
        navigate("/feed", { replace: true });
        return;
      }

      // Se não estiver autenticado e estiver tentando acessar uma rota protegida, redirecionar para login
      if (
        !usuarioFirebase &&
        !modoDemo &&
        !autenticadoSpotify && // Verificar todos os tipos de autenticação
        location.pathname !== "/" &&
        location.pathname !== "/login" &&
        location.pathname !== "/registro" &&
        location.pathname !== "/splash" &&
        location.pathname !== "/callback" &&
        location.pathname !== "/politica-de-privacidade" &&
        location.pathname !== "/termos-de-uso" &&
        location.pathname !== "/exclusao-de-conta"
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
    if (usuarioFirebase || usuarioSpotify) {
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
  }, [
    usuarioFirebase,
    usuarioSpotify,
    location.pathname,
    activeView,
    navigate,
  ]);

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
  // Mostrar tela de carregamento enquanto verifica autenticação
  if (carregandoAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // Renderizar o componente de callback do Spotify
  if (location.pathname === "/callback") {
    return <SpotifyCallback />;
  }

  // Renderizar splash apenas se o usuário não estiver autenticado
  if (
    (location.pathname === "/splash" || location.pathname === "/") &&
    !usuarioFirebase &&
    !usuarioDemo &&
    !usuarioSpotify
  ) {
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

  // Layout principal da aplicaçãom
  return (
    <>
      <div className="flex flex-col lg:flex-row w-full lg:w-[90vw] xl:w-[85vw] 2xl:w-[1440px]  mx-auto m-2 mt-4 lg:mt-12 gap-3 px-2 lg:px-0 content-area">
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
                path="/pesquisar"
                element={
                  <Feed activeView="pesquisar" termoPesquisa={termoPesquisa} />
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
              <Route path="/callback" element={<SpotifyCallback />} />
              <Route path="/album/:id" element={<Feed activeView="album" />} />
              <Route
                path="/politica-de-privacidade"
                element={<PoliticaDePrivacidade />}
              />
              <Route path="/termos-de-uso" element={<TermosDeUso />} />
              <Route path="/exclusao-de-conta" element={<ExclusaoDeConta />} />
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
