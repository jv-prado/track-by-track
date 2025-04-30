import Logo from "./assets/Logo.svg";
import { FaUser, FaGlobe } from "react-icons/fa";
import { IoStarSharp } from "react-icons/io5";
import { IoMdExit } from "react-icons/io";
import "../../App.css";
import { MdAlbum } from "react-icons/md";
import SidebarItem from "./SideBarItem";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { fazerLogout } from "../../services/firebase";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function Sidebar({ activeView, setActiveView }) {
  const { usuario: usuarioFirebase, usuarioDemo, usuarioAtivo } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [modoDemoBrowser, setModoDemo] = useState(false);

  // Determinar o idioma atual
  const currentLanguage = i18n.language || "pt-BR";
  const isPortuguese = currentLanguage.startsWith("pt");

  // Função para verificar o localStorage e detectar modo demo
  const verificarModoDemo = () => {
    try {
      const demoToken = localStorage.getItem("demo_token");
      const demoExpiry = localStorage.getItem("demo_token_expiry");
      const demoAtivo =
        demoToken && demoExpiry && parseInt(demoExpiry) > Date.now();
      setModoDemo(!!demoAtivo);
    } catch (error) {
      console.error("Erro ao verificar modo demo:", error);
      setModoDemo(false);
    }
  };

  // Verificar o localStorage ao montar o componente e quando ele for atualizado
  useEffect(() => {
    verificarModoDemo();

    // Criar um intervalo para verificar alterações no localStorage periodicamente (a cada segundo)
    const verificacaoPeriodica = setInterval(verificarModoDemo, 1000);

    return () => {
      clearInterval(verificacaoPeriodica);
    };
  }, []);

  const handleLogout = async () => {
    // Se for usuário demo, limpar os dados do localStorage
    if (usuarioDemo || modoDemoBrowser) {
      localStorage.removeItem("demo_token");
      localStorage.removeItem("demo_token_expiry");
      localStorage.removeItem("demo_usuario");
      localStorage.removeItem("modo_demo_ativo");
      window.location.href = "/login";
      return;
    }

    // Se for usuário Firebase, fazer logout normal
    if (usuarioFirebase) {
      await fazerLogout();
    }
    navigate("/login");
  };

  // Função para alternar entre idiomas
  const changeLanguage = () => {
    const newLanguage = isPortuguese ? "en-US" : "pt-BR";
    i18n.changeLanguage(newLanguage);
    localStorage.setItem("i18nextLng", newLanguage);
  };

  // Verificar se o usuário está autenticado via contexto OU via localStorage
  const usuarioAtivoLocal = usuarioAtivo || modoDemoBrowser;

  // Rendereiza a opção de login no menu de navegação
  const renderLoginOption = () => (
    <button
      onClick={() => {
        navigate("/login");
      }}
      className="flex items-center justify-center space-x-2 p-2 rounded-xl cursor-pointer text-white hover:bg-verde-claro hover:text-preto transition-colors mt-auto w-full"
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
          d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
        />
      </svg>
      <span>{t("app.login")}</span>
    </button>
  );

  // Renderizando dois layouts diferentes: desktop e mobile
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex bg-cinza-escuro rounded-xl py-4 md:py-10 px-4 md:px-10 w-full md:max-w-[200px] flex-col items-center gap-4 md:gap-10 mb-4 md:mb-0 md:h-fit relative">
        <Link to="/">
          <img
            className="w-28 md:w-40 h-auto hover:scale-110 transition-all duration-600"
            src={Logo}
            alt="Logo do Track by Track"
          />
        </Link>
        <nav className="flex flex-col w-full items-center">
          <ul className="flex flex-col items-center md:items-stretch gap-3 md:gap-12 text-center max-w-[90%] md:max-w-full">
            {!usuarioAtivoLocal ? (
              // Botão de login quando não está autenticado
              renderLoginOption()
            ) : (
              // Itens de navegação quando está autenticado
              <>
                <SidebarItem
                  icon={FaGlobe}
                  text={t("app.feed")}
                  iconSize="text-2xl md:text-3xl"
                  active={activeView === "feed"}
                  onClick={() => {
                    setActiveView("feed");
                    navigate("/feed");
                  }}
                />
                <SidebarItem
                  icon={MdAlbum}
                  text={t("app.albums")}
                  iconSize="text-2xl md:text-3xl"
                  active={activeView === "albuns"}
                  onClick={() => {
                    setActiveView("albuns");
                    navigate("/albuns");
                  }}
                />
                <SidebarItem
                  icon={FaUser}
                  text={t("app.artists")}
                  iconSize="text-2xl md:text-3xl"
                  active={activeView === "artistas"}
                  onClick={() => {
                    setActiveView("artistas");
                    navigate("/artistas");
                  }}
                />
                <SidebarItem
                  icon={IoStarSharp}
                  text={t("app.myRatings")}
                  iconSize="text-2xl md:text-3xl"
                  active={activeView === "classificacoes"}
                  onClick={() => {
                    setActiveView("classificacoes");
                    navigate("/minhas-avaliacoes");
                  }}
                />

                {/* Botão de logout */}
                <SidebarItem
                  icon={IoMdExit}
                  text={t("app.logout")}
                  iconSize="text-2xl md:text-3xl"
                  onClick={handleLogout}
                />
              </>
            )}
          </ul>
        </nav>
      </aside>

      {/* Mobile Bottom Navigation */}
      {usuarioAtivoLocal && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-cinza-escuro border-t border-gray-700 z-50 px-1 py-2 flex justify-around items-center safe-bottom">
          <button
            onClick={() => {
              setActiveView("feed");
              navigate("/feed");
            }}
            className={`flex flex-col items-center justify-center pt-1 pb-1 px-2 rounded-lg ${
              activeView === "feed"
                ? "text-verde-destaque bg-verde-destaque/10"
                : "text-gray-400"
            }`}
          >
            <FaGlobe className="text-xl" />
            <span className="text-xs mt-1">{t("app.feed")}</span>
          </button>

          <button
            onClick={() => {
              setActiveView("albuns");
              navigate("/albuns");
            }}
            className={`flex flex-col items-center justify-center pt-1 pb-1 px-2 rounded-lg ${
              activeView === "albuns"
                ? "text-verde-destaque bg-verde-destaque/10"
                : "text-gray-400"
            }`}
          >
            <MdAlbum className="text-xl" />
            <span className="text-xs mt-1">{t("app.albums")}</span>
          </button>

          <button
            onClick={() => {
              setActiveView("artistas");
              navigate("/artistas");
            }}
            className={`flex flex-col items-center justify-center pt-1 pb-1 px-2 rounded-lg ${
              activeView === "artistas"
                ? "text-verde-destaque bg-verde-destaque/10"
                : "text-gray-400"
            }`}
          >
            <FaUser className="text-xl" />
            <span className="text-xs mt-1">{t("app.artists")}</span>
          </button>

          <button
            onClick={() => {
              setActiveView("classificacoes");
              navigate("/minhas-avaliacoes");
            }}
            className={`flex flex-col items-center justify-center pt-1 pb-1 px-2 rounded-lg ${
              activeView === "classificacoes"
                ? "text-verde-destaque bg-verde-destaque/10"
                : "text-gray-400"
            }`}
          >
            <IoStarSharp className="text-xl" />
            <span className="text-xs mt-1">{t("app.myRatings")}</span>
          </button>

          {/* Botão de menu em vez de botão de logout */}
          <button
            onClick={changeLanguage}
            className="flex flex-col items-center justify-center pt-1 pb-1 px-2 rounded-lg text-gray-400"
          >
            <img
              src={
                isPortuguese
                  ? "/src/assets/Flag_of_Brazil.svg"
                  : "/src/assets/Flag_of_the_United_States.svg"
              }
              alt={isPortuguese ? "English" : "Português"}
              className="w-5 h-5 object-cover rounded-full border border-gray-600"
            />
            <span className="text-xs mt-1">{isPortuguese ? "PT" : "EN"}</span>
          </button>
        </nav>
      )}
    </>
  );
}
