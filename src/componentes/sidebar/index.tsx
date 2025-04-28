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

export default function Sidebar({ activeView, setActiveView }) {
  const { usuario: usuarioFirebase, usuarioDemo, usuarioAtivo } = useAuth();
  const navigate = useNavigate();
  const [modoDemoBrowser, setModoDemo] = useState(false);

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

  // Verificar se o usuário está autenticado via contexto OU via localStorage
  const usuarioAtivoLocal = usuarioAtivo || modoDemoBrowser;

  return (
    <aside className="bg-cinza-escuro rounded-xl py-5 md:py-10 px-4 md:px-10 w-full md:max-w-[200px] flex flex-col items-center gap-6 md:gap-10 mb-4 md:mb-0 md:h-fit">
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
            <Link
              to="/login"
              className="bg-verde-destaque text-white py-2 px-4 rounded-full font-medium hover:bg-verde-destaque/90 transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg"
            >
              Entrar na sua conta
            </Link>
          ) : (
            // Itens de navegação quando está autenticado

            <>
              <SidebarItem
                icon={FaGlobe}
                text="Feed"
                iconSize="text-2xl md:text-3xl"
                active={activeView === "feed"}
                onClick={() => {
                  setActiveView("feed");
                  navigate("/feed");
                }}
              />
              <SidebarItem
                icon={MdAlbum}
                text="Álbuns"
                iconSize="text-2xl md:text-3xl"
                active={activeView === "albuns"}
                onClick={() => {
                  setActiveView("albuns");
                  navigate("/albuns");
                }}
              />
              <SidebarItem
                icon={FaUser}
                text="Artistas"
                iconSize="text-2xl md:text-3xl"
                active={activeView === "artistas"}
                onClick={() => {
                  setActiveView("artistas");
                  navigate("/artistas");
                }}
              />
              <SidebarItem
                icon={IoStarSharp}
                text="Minhas avaliações"
                iconSize="text-2xl md:text-3xl"
                active={activeView === "classificacoes"}
                onClick={() => {
                  setActiveView("classificacoes");
                  navigate("/minhas-avaliacoes");
                }}
              />

              <SidebarItem
                icon={IoMdExit}
                text="Sair"
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
