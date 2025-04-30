import Logo from "./assets/Logo.svg";
import { FaUser, FaGlobe, FaCamera, FaInstagram } from "react-icons/fa";
import { IoStarSharp } from "react-icons/io5";
import { IoMdExit } from "react-icons/io";
import "../../App.css";
import { MdAlbum } from "react-icons/md";
import SidebarItem from "./SideBarItem";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  fazerLogout,
  updateUserProfile,
  uploadFile,
} from "../../services/firebase";
import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import BandeiraBrasil from "../../assets/Flag_of_Brazil.svg";
import BandeiraEUA from "../../assets/Flag_of_the_United_States.svg";

export default function Sidebar({ activeView, setActiveView }) {
  const {
    usuario: usuarioFirebase,
    usuarioDemo,
    usuarioAtivo,
    atualizarFotoPerfil,
  } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [modoDemoBrowser, setModoDemo] = useState(false);
  const [perfilMenuAberto, setPerfilMenuAberto] = useState(false);
  const [fotoPerfilLocal, setFotoPerfilLocal] = useState<string | null>(null);
  const [atualizandoFoto, setAtualizandoFoto] = useState(false);
  const menuRef = useRef(null);

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

  // Fechar o menu ao clicar fora dele
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setPerfilMenuAberto(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

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

      // Definir a view ativa como "feed" para o próximo login
      localStorage.setItem("activeView", "feed");

      window.location.href = "/login";
      return;
    }

    // Se for usuário Firebase, fazer logout normal
    if (usuarioFirebase) {
      await fazerLogout();
    }

    // Definir a view ativa como "feed" para o próximo login
    localStorage.setItem("activeView", "feed");

    navigate("/login");
  };

  // Função para alternar entre idiomas
  const changeLanguage = () => {
    const newLanguage = isPortuguese ? "en-US" : "pt-BR";
    i18n.changeLanguage(newLanguage);
    localStorage.setItem("i18nextLng", newLanguage);
    setPerfilMenuAberto(false);
  };

  // Função para abrir a câmera ou o seletor de imagem
  const handleTrocarFoto = () => {
    // Verificar se está atualizando
    if (atualizandoFoto) return;

    // Verificar se é usuário demo
    if (usuarioDemo) {
      // Exibir alguma mensagem de erro (pode ser adicionado um toast ou alert aqui)
      console.error("Usuários demo não podem alterar a foto");
      setPerfilMenuAberto(false);
      return;
    }

    // Criar e configurar um elemento input
    const inputElement = document.createElement("input");
    inputElement.type = "file";
    inputElement.accept = "image/*";

    inputElement.onchange = async (e) => {
      const fileInput = e.target as HTMLInputElement;
      if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];

        // Verificar se o arquivo é uma imagem
        if (!file.type.startsWith("image/")) {
          console.error("O arquivo deve ser uma imagem");
          return;
        }

        // Verificar o tamanho do arquivo (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
          console.error("O arquivo deve ter menos de 5MB");
          return;
        }

        try {
          setAtualizandoFoto(true);

          // Criar uma URL temporária para visualização imediata
          const urlTemporaria = URL.createObjectURL(file);
          setFotoPerfilLocal(urlTemporaria);

          // Fazer upload do arquivo para o Firebase Storage
          const filePath = `profile_pictures/${usuarioFirebase.uid}/${file.name}`;
          const imageUrl = await uploadFile(file, filePath);

          // Atualizar o perfil do usuário com a nova foto
          await updateUserProfile(usuarioFirebase, {
            photoURL: imageUrl,
          });

          // Se a função de atualizar foto do contexto existir, usá-la
          if (typeof atualizarFotoPerfil === "function") {
            atualizarFotoPerfil(imageUrl);
          }

          // Atualizar a foto local com a URL real
          setFotoPerfilLocal(imageUrl);
        } catch (error) {
          console.error("Erro ao atualizar foto:", error);
          // Limpar a foto temporária em caso de erro
          setFotoPerfilLocal(null);
        } finally {
          setAtualizandoFoto(false);
        }
      }
    };

    // Simular o clique no input
    inputElement.click();
    setPerfilMenuAberto(false);
  };

  // Verificar se o usuário está autenticado via contexto OU via localStorage
  const usuarioAtivoLocal = usuarioAtivo || modoDemoBrowser;

  // Obter foto do usuário ou usar fallback
  const obterFotoPerfil = () => {
    // Prioridade: foto temporária local, depois Firebase, depois Demo
    if (fotoPerfilLocal) {
      return fotoPerfilLocal;
    } else if (usuarioFirebase && usuarioFirebase.photoURL) {
      return usuarioFirebase.photoURL;
    } else if (usuarioDemo && usuarioDemo.photoURL) {
      return usuarioDemo.photoURL;
    }
    return null;
  };

  const fotoPerfil = obterFotoPerfil();
  const nomeUsuario =
    usuarioFirebase?.displayName || usuarioDemo?.nome || "Usuário";

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
      {/* Desktop Sidebar - visível apenas em telas acima de 1000px */}
      <aside className="hidden lg:flex bg-cinza-escuro rounded-xl py-4 md:py-10 px-4 md:px-10 w-full md:max-w-[200px] flex-col items-center gap-4 md:gap-10 mb-4 md:mb-0 md:h-fit relative">
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
        {/* Instagram - Desktop Sidebar */}
        <a
          href="https://www.instagram.com/trackbytrackapp"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-full mt-4 px-3 py-1.5 rounded-md bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 transition-all duration-300 opacity-80 hover:opacity-100 hover:shadow-sm hover:shadow-pink-500/20"
          title="Instagram"
          style={{ textDecoration: "none" }}
        >
          <FaInstagram className="text-white text-sm mr-2" />
          <span className="text-white text-xs font-medium">Instagram</span>
        </a>
        {/* Fim Instagram - Desktop Sidebar */}
      </aside>

      {/* Mobile Bottom Navigation - visível em telas abaixo de 1000px */}
      {usuarioAtivoLocal && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-cinza-escuro border-t border-gray-700 z-50 px-1 py-2 flex justify-around items-center safe-bottom">
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

          {/* Perfil do Usuário - Foto com Menu Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setPerfilMenuAberto(!perfilMenuAberto)}
              className="flex flex-col items-center justify-center pt-1 pb-1 px-2 rounded-lg text-gray-400"
            >
              <div className="w-6 h-6 rounded-full overflow-hidden border border-gray-600 flex items-center justify-center bg-verde-destaque/20">
                {fotoPerfil ? (
                  <img
                    src={fotoPerfil}
                    alt={nomeUsuario}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-verde-destaque text-sm font-bold">
                    {nomeUsuario.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1">{t("app.profile")}</span>
            </button>

            {/* Menu Dropdown */}
            {perfilMenuAberto && (
              <div className="absolute bottom-full right-0 mb-2 bg-cinza-escuro rounded-lg shadow-lg border border-gray-700 overflow-hidden w-36">
                {/* Opção: Trocar Idioma */}
                <button
                  onClick={changeLanguage}
                  className="flex items-center w-full px-3 py-2 hover:bg-cinza-escuro/80 text-left text-sm text-gray-300"
                >
                  <div className="flex items-center">
                    <img
                      src={isPortuguese ? BandeiraEUA : BandeiraBrasil}
                      alt={isPortuguese ? "English" : "Português"}
                      className="w-5 h-3 mr-2 object-cover"
                    />
                    {isPortuguese ? "English" : "Português"}
                  </div>
                </button>

                {/* Opção: Trocar Foto */}
                <button
                  onClick={handleTrocarFoto}
                  disabled={atualizandoFoto}
                  className="flex items-center w-full px-3 py-2 hover:bg-cinza-escuro/80 text-left text-sm text-gray-300 disabled:opacity-70"
                >
                  <FaCamera className="mr-2 text-verde-destaque" />
                  {atualizandoFoto ? t("app.updating") : t("app.changePhoto")}
                </button>

                {/* Opção: Logout */}
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-3 py-2 hover:bg-cinza-escuro/80 text-left text-sm text-gray-300 border-t border-gray-700"
                >
                  <IoMdExit className="mr-2 text-verde-destaque" />
                  {t("app.logout")}
                </button>
              </div>
            )}
          </div>
        </nav>
      )}
    </>
  );
}
