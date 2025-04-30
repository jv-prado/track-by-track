import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  fazerLogout,
  updateUserProfile,
  uploadFile,
} from "../services/firebase/index";
import { useNavigate } from "react-router-dom";
import { FaCamera } from "react-icons/fa";
import { useTranslation } from "react-i18next";

export default function PerfilUsuario() {
  const { t, i18n } = useTranslation();
  const [carregando, setCarregando] = useState(true);
  const [fotoPerfil, setFotoPerfil] = useState(null);
  const [erro, setErro] = useState("");
  const fileInputRef = useRef(null);
  const { usuario: usuarioFirebase, usuarioDemo, usuarioAtivo } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar se o usuário está logado no Firebase ou em modo Demo
    setCarregando(false);

    if (usuarioFirebase?.photoURL) {
      setFotoPerfil(usuarioFirebase.photoURL);
    }
  }, [usuarioFirebase]);

  const handleLogout = async () => {
    // Se for usuário demo, limpar os dados do localStorage
    if (usuarioDemo) {
      localStorage.removeItem("demo_token");
      localStorage.removeItem("demo_token_expiry");
      localStorage.removeItem("demo_usuario");
      window.location.href = "/login";
      return;
    }

    // Se for usuário Firebase, fazer logout normal
    if (usuarioFirebase) {
      await fazerLogout();
    }

    // Redirecionar para a tela de login
    navigate("/login");
  };

  const handleTrocarFoto = () => {
    if (usuarioDemo) {
      setErro(t("userProfile.demoPhotoError"));
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Verificar se o arquivo é uma imagem
    if (!file.type.startsWith("image/")) {
      setErro(t("userProfile.invalidImageError"));
      return;
    }

    // Verificar o tamanho do arquivo (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErro(t("userProfile.fileSizeError"));
      return;
    }

    try {
      setCarregando(true);
      setErro("");

      // Usar o Firebase Storage para todos os ambientes
      const filePath = `profile_pictures/${usuarioFirebase.uid}/${file.name}`;
      const imageUrl = await uploadFile(file, filePath);

      // Atualizar a foto do perfil no Firebase Auth
      await updateUserProfile(usuarioFirebase, {
        photoURL: imageUrl,
      });

      setFotoPerfil(imageUrl);
    } catch (error) {
      console.error("Erro ao atualizar foto:", error);
      setErro(t("userProfile.uploadError"));
    } finally {
      setCarregando(false);
    }
  };

  if (carregando) {
    return (
      <div className="animate-pulse bg-cinza-escuro h-10 w-full rounded-xl"></div>
    );
  }

  if (!usuarioAtivo) {
    return (
      <a
        href="/login"
        className="bg-verde-claro text-cinza-escuro py-2 px-4 rounded-full font-medium hover:bg-opacity-90 transition-all transform hover:scale-105 flex items-center justify-center cursor-pointer shadow-lg"
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
        </svg>
        {t("userProfile.loginSignUp")}
      </a>
    );
  }

  return (
    <div className="bg-cinza-escuro rounded-xl p-3">
      <div className="flex items-center gap-3">
        {/* Avatar do usuário */}
        <div className="relative group">
          <div className="w-10 h-10 rounded-full bg-verde-pastel flex items-center justify-center text-cinza-escuro font-bold overflow-hidden">
            {fotoPerfil ? (
              <img
                src={fotoPerfil}
                alt={t("userProfile.profilePicture")}
                className="w-full h-full object-cover"
              />
            ) : usuarioDemo ? (
              "D"
            ) : (
              usuarioFirebase?.displayName?.charAt(0).toUpperCase() || "U"
            )}
          </div>
          {!usuarioDemo && (
            <>
              <button
                onClick={handleTrocarFoto}
                className="absolute inset-0 w-full h-full rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <FaCamera className="text-white text-sm" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </>
          )}
        </div>

        <div className="flex-1 overflow-hidden">
          <p className="font-bold text-sm truncate">
            {usuarioDemo
              ? usuarioDemo.nome ||
                (i18n.language.startsWith("en") ? "Demo User" : "Usuário Demo")
              : usuarioFirebase?.displayName || t("userProfile.user")}
          </p>
          <p className="text-xs text-gray-400 truncate">
            {usuarioDemo
              ? t("userProfile.demoMode")
              : usuarioFirebase?.email || ""}
          </p>
        </div>
      </div>

      {erro && <div className="mt-2 text-xs text-red-500">{erro}</div>}

      <div className="mt-4 pt-2 border-t border-gray-700">
        {/* Status da conta */}
        <div className="text-xs text-verde-claro mb-2 flex items-center">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          {usuarioDemo
            ? t("userProfile.dataSavedLocally")
            : t("userProfile.ratingsSavedToAccount")}
        </div>

        {/* Botão de logout */}
        <button
          onClick={handleLogout}
          className="text-xs py-1 px-2 bg-cinza-medio text-white rounded w-full hover:bg-cinza-claro/20 cursor-pointer"
        >
          {t("userProfile.logout")}
        </button>
      </div>
    </div>
  );
}
