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
      className="flex items-center space-x-2 p-3 rounded-xl cursor-pointer text-white hover:bg-verde-claro hover:text-preto transition-colors mt-auto"
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

  return (
    <aside className="bg-cinza-escuro rounded-xl py-5 md:py-10 px-4 md:px-10 w-full md:max-w-[200px] flex flex-col items-center gap-6 md:gap-10 mb-4 md:mb-0 md:h-fit relative">
      {/* Botão de troca de idioma no canto superior direito */}
      <button
        onClick={changeLanguage}
        className="absolute top-4 right-4 w-8 h-6 rounded overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border border-gray-600 block md:hidden"
        title={isPortuguese ? "Mudar para inglês" : "Change to Portuguese"}
      >
        <img
          src={
            isPortuguese ? "/images/flags/usa.svg" : "/images/flags/brazil.svg"
          }
          alt={isPortuguese ? "English" : "Português"}
          className="w-full h-full object-cover"
        />
      </button>

      <Link to="/">
        <img
          className="w-28 md:w-40 h-auto hover:scale-110 transition-all duration-600"
          src={Logo}
          alt="Logo do Track by Track"
        />
      </Link>
      <nav className="flex flex-col w-full">
        <ul className="flex flex-col gap-6 md:gap-12 text-center w-full">
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
  );
}
