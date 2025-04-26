import Logo from "./assets/Logo.svg";
import { FaUser, FaSpotify } from "react-icons/fa";
import { IoStarSharp } from "react-icons/io5";
import { IoMdExit } from "react-icons/io";
import "../../App.css";
import { MdAlbum } from "react-icons/md";
import SidebarItem from "./SideBarItem";
import { Link } from "react-router-dom";
import { isAuthenticated, logout } from "../../services/auth";

export default function Sidebar({ activeView, setActiveView }) {
  const autenticado = isAuthenticated();

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

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
          {!autenticado ? (
            // Botão de login quando não está autenticado
            <Link
              to="/login"
              className="bg-[#1DB954] text-white py-2 px-4 rounded-full font-medium hover:bg-[#1ED760] transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg"
            >
              <FaSpotify className="text-xl" />
              Entrar com Spotify
            </Link>
          ) : (
            // Itens de navegação quando está autenticado
            <>
              <SidebarItem
                icon={MdAlbum}
                text="Álbuns"
                iconSize="text-2xl md:text-3xl"
                active={activeView === "albuns"}
                onClick={() => setActiveView("albuns")}
              />
              <SidebarItem
                icon={FaUser}
                text="Artistas"
                iconSize="text-2xl md:text-3xl"
                active={activeView === "artistas"}
                onClick={() => setActiveView("artistas")}
              />
              <SidebarItem
                icon={IoStarSharp}
                text="Minhas avaliações"
                iconSize="text-2xl md:text-3xl"
                active={activeView === "classificacoes"}
                onClick={() => setActiveView("classificacoes")}
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
