import { useState, useEffect } from "react";
import { getUserData, logout, isAuthenticated } from "../services/auth";

export default function PerfilUsuario() {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const carregarDadosUsuario = () => {
      try {
        setCarregando(true);

        // Verificar se o usuário está autenticado
        if (!isAuthenticated()) {
          setUsuario(null);
          setCarregando(false);
          return;
        }

        // Obter dados do usuário
        const dadosUsuario = getUserData();
        setUsuario(dadosUsuario);
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
        setUsuario(null);
      } finally {
        setCarregando(false);
      }
    };

    carregarDadosUsuario();
  }, []);

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  if (carregando) {
    return (
      <div className="animate-pulse bg-cinza-escuro h-10 w-full rounded-xl"></div>
    );
  }

  if (!usuario) {
    return (
      <a
        href="/login"
        className="bg-[#1DB954] text-white py-2 px-4 rounded-full font-medium hover:bg-[#1ED760] transition-all transform hover:scale-105 flex items-center justify-center cursor-pointer shadow-lg"
      >
        <svg
          className="w-5 h-5 mr-2"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM16.5563 16.5563C16.3204 16.7922 15.9466 16.7922 15.7107 16.5563C14.0323 14.878 11.6597 14.4715 8.31426 15.2266C7.94716 15.3042 7.58622 15.0838 7.50864 14.7167C7.43105 14.3497 7.65147 13.9887 8.01857 13.9111C11.7247 13.0695 14.4658 13.5639 16.4414 15.5394C16.6773 15.7753 16.6773 16.1491 16.4414 16.385L16.5563 16.5563Z" />
        </svg>
        Entrar com Spotify
      </a>
    );
  }

  return (
    <div className="bg-cinza-escuro rounded-xl p-3 flex items-center gap-3">
      {usuario.image ? (
        <img
          src={usuario.image}
          alt={`Foto de ${usuario.name}`}
          className="w-10 h-10 rounded-full object-cover"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-verde-pastel flex items-center justify-center text-cinza-escuro font-bold">
          {usuario.name?.charAt(0).toUpperCase() || "U"}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <p className="font-bold text-sm truncate">{usuario.name}</p>
        <p className="text-xs text-gray-400 truncate">{usuario.email}</p>
      </div>

      <button
        onClick={handleLogout}
        className="text-xs text-red-500 hover:text-red-400 transition-colors cursor-pointer"
      >
        Sair
      </button>
    </div>
  );
}
