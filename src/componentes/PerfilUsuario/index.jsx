import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { sairDaConta } from "../../services/firebase";
import {
  estaAutenticado,
  obterPerfilUsuario,
  logout as logoutSpotify,
} from "../../services/spotify";
import defaultUserImage from "../../assets/default-user.png";

const PerfilUsuario = () => {
  const { usuario, fazerLogout } = useAuth();
  const [usuarioSpotify, setUsuarioSpotify] = useState(null);
  const [demoModeAtivo, setDemoModeAtivo] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Verificar se está no modo demo ao montar o componente
  useEffect(() => {
    const verificarModoDemo = () => {
      const demoToken = localStorage.getItem("demo_token");
      const demoExpiry = localStorage.getItem("demo_token_expiry");
      const modoDemo =
        demoToken && demoExpiry && parseInt(demoExpiry) > Date.now();

      setDemoModeAtivo(modoDemo);

      // Verificar se está autenticado com Spotify e buscar perfil se necessário
      const autenticadoSpotify = estaAutenticado();
      if (autenticadoSpotify && !usuarioSpotify) {
        carregarPerfilSpotify();
      }
    };

    verificarModoDemo();
  }, []);

  // Carregar dados do perfil do Spotify
  const carregarPerfilSpotify = async () => {
    try {
      const perfil = await obterPerfilUsuario();
      setUsuarioSpotify(perfil);
    } catch (error) {
      console.error("Erro ao carregar perfil do Spotify:", error);
    }
  };

  // Função de logout
  const handleLogout = async () => {
    try {
      setCarregando(true);

      // Se estiver em modo demo, limpar dados do demo
      if (demoModeAtivo) {
        // Limpar dados do demo
        localStorage.removeItem("demo_token");
        localStorage.removeItem("demo_token_expiry");
        localStorage.removeItem("demo_usuario");
        localStorage.removeItem("modo_demo_ativo");
        localStorage.removeItem("activeView");

        // Limpar dados de avaliações do modo demo
        localStorage.removeItem("avaliacoesFaixas");
        localStorage.removeItem("mapaFaixasAlbuns");
        localStorage.removeItem("datasAvaliacoes");
        localStorage.removeItem("preferenciasAlbuns");

        // Limpar dados de visualização
        localStorage.removeItem("activeView");

        setDemoModeAtivo(false);
      }
      // Se estiver autenticado com Spotify, fazer logout do Spotify
      else if (usuarioSpotify) {
        // Usar função melhorada de logout do Spotify que limpa todos os dados
        logoutSpotify();
        setUsuarioSpotify(null);

        // Verificação adicional: limpar manualmente dados do Spotify
        const spotifyKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith("spotify_") || key.includes("spotify"))) {
            spotifyKeys.push(key);
          }
        }

        // Remover todos os itens identificados
        spotifyKeys.forEach((key) => localStorage.removeItem(key));

        // Limpar outros dados de autenticação relevantes
        localStorage.removeItem("activeView");
        sessionStorage.removeItem("login_redirect");
      }
      // Caso contrário, deslogar normalmente
      else if (usuario) {
        await fazerLogout();
        await sairDaConta();
      }

      // Forçar navegação para a tela de login
      navigate("/login");
      setCarregando(false);
    } catch (error) {
      console.error("Erro durante logout:", error);

      // Em caso de erro, fazer uma limpeza forçada e redirecionar
      localStorage.removeItem("activeView");
      localStorage.removeItem("spotify_autenticado");
      localStorage.removeItem("spotify_token_expires_at");
      localStorage.removeItem("spotify_user_profile");

      navigate("/login");
      setCarregando(false);
    }
  };

  // Se estiver em modo demo, mostrar informações do usuário demo
  if (demoModeAtivo) {
    const usuarioDemo = JSON.parse(
      localStorage.getItem("demo_usuario") || "{}"
    );

    return (
      <div className="bg-cinza-escuro p-4 rounded-lg shadow-md w-full flex flex-col">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-2xl font-bold text-gray-300 mr-3">
            {usuarioDemo.nome?.charAt(0) || "D"}
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">
              {usuarioDemo.nome || t("profile.demoUser")}
            </h3>
            <p className="text-gray-400 text-sm">
              {t("demoMode.demoModeActive")}
            </p>
          </div>
        </div>

        <div className="mt-auto">
          <button
            onClick={handleLogout}
            disabled={carregando}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            {carregando ? t("profile.exitingAccount") : t("profile.exit")}
          </button>
        </div>
      </div>
    );
  }

  // Se estiver autenticado com Spotify, mostrar perfil do Spotify
  if (usuarioSpotify) {
    return (
      <div className="bg-cinza-escuro p-4 rounded-lg shadow-md w-full flex flex-col">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 rounded-full overflow-hidden mr-3">
            <img
              src={
                usuarioSpotify.images && usuarioSpotify.images.length > 0
                  ? usuarioSpotify.images[0].url
                  : defaultUserImage
              }
              alt={usuarioSpotify.display_name || "Usuário Spotify"}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">
              {usuarioSpotify.display_name || "Usuário Spotify"}
            </h3>
            <p className="text-green-500 text-sm">Via Spotify</p>
          </div>
        </div>

        <div className="mt-auto">
          <button
            onClick={handleLogout}
            disabled={carregando}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            {carregando ? t("profile.exitingAccount") : t("profile.exit")}
          </button>
        </div>
      </div>
    );
  }

  // Se não houver usuário, não renderizar nada ou mostrar opção de login
  if (!usuario) {
    return (
      <div className="bg-cinza-escuro p-4 rounded-lg shadow-md w-full flex flex-col">
        <div className="flex items-center justify-center mb-4">
          <p className="text-gray-400">{t("profile.notLoggedIn")}</p>
        </div>

        <div className="mt-auto">
          <button
            onClick={() => navigate("/login")}
            className="w-full bg-verde-destaque hover:bg-verde-destaque/90 text-black py-2 px-4 rounded-lg transition-colors"
          >
            {t("profile.login")}
          </button>
        </div>
      </div>
    );
  }

  // Renderização padrão para usuários autenticados com Firebase
  return (
    <div className="bg-cinza-escuro p-4 rounded-lg shadow-md w-full flex flex-col">
      <div className="flex items-center mb-4">
        <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-2xl font-bold text-gray-300 mr-3">
          {usuario.nome?.charAt(0) || usuario.email?.charAt(0) || "U"}
        </div>
        <div>
          <h3 className="text-white font-semibold text-lg">
            {usuario.nome || usuario.email?.split("@")[0] || t("profile.user")}
          </h3>
          <p className="text-gray-400 text-sm">{usuario.email || ""}</p>
        </div>
      </div>

      <div className="mt-auto">
        <button
          onClick={handleLogout}
          disabled={carregando}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
        >
          {carregando ? t("profile.exitingAccount") : t("profile.exit")}
        </button>
      </div>
    </div>
  );
};

export default PerfilUsuario;
