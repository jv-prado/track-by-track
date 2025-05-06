import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  fazerLogout,
  updateUserProfile,
  uploadFile,
} from "../../services/firebase/index";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import InfoUsuario from "./InfoUsuario";
import StatusContaUsuario from "./StatusContaUsuario";

export default function PerfilUsuario() {
  const { t, i18n } = useTranslation();
  const [carregando, setCarregando] = useState(true);
  const [fotoPerfil, setFotoPerfil] = useState(null);
  const [erro, setErro] = useState("");
  const fileInputRef = useRef(null);
  const { usuario: usuarioFirebase, usuarioAtivo } = useAuth();
  const navigate = useNavigate();
  const [emailSpotify, setEmailSpotify] = useState("");
  const [editandoNome, setEditandoNome] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoSobrenome, setNovoSobrenome] = useState("");
  const [erroNome, setErroNome] = useState("");
  const [salvandoNome, setSalvandoNome] = useState(false);

  useEffect(() => {
    setCarregando(false);
    if (usuarioFirebase?.photoURL) {
      setFotoPerfil(usuarioFirebase.photoURL);
    }
    async function fetchEmailSpotify() {
      try {
        if (usuarioFirebase) {
          let spotifyId = null;
          if (usuarioFirebase.uid.startsWith("spotify_")) {
            spotifyId = usuarioFirebase.uid.replace("spotify_", "");
          }
          if (!spotifyId) {
            const authMethod = localStorage.getItem("spotify_auth_method");
            if (authMethod) {
              const perfilCache = JSON.parse(
                localStorage.getItem("spotify_user_profile") || "{}"
              );
              if (
                perfilCache &&
                perfilCache.id &&
                perfilCache.id !== "spotify_user"
              ) {
                spotifyId = perfilCache.id;
              }
            }
          }
          if (spotifyId) {
            const db = getFirestore();
            const userRef = doc(db, "usuariosSpotify", spotifyId);
            try {
              const userDoc = await getDoc(userRef);
              if (userDoc.exists()) {
                const userData = userDoc.data();
                const email = userData.email;
                if (email) {
                  setEmailSpotify(email);
                } else {
                  setEmailSpotify(usuarioFirebase.email || "");
                }
              } else {
                setEmailSpotify(usuarioFirebase.email || "");
              }
            } catch (firestoreError) {
              setEmailSpotify(usuarioFirebase.email || "");
            }
          } else {
            setEmailSpotify(usuarioFirebase.email || "");
          }
        }
      } catch (error) {
        if (usuarioFirebase?.email) {
          setEmailSpotify(usuarioFirebase.email);
        }
      }
    }
    fetchEmailSpotify();
  }, [usuarioFirebase]);

  const handleLogout = async () => {
    if (usuarioFirebase) {
      await fazerLogout();
    }
    localStorage.setItem("activeView", "feed");
    navigate("/login");
  };

  const handleTrocarFoto = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErro(t("userProfile.invalidImageError"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErro(t("userProfile.fileSizeError"));
      return;
    }
    try {
      setCarregando(true);
      setErro("");
      const filePath = `profile_pictures/${usuarioFirebase.uid}/${file.name}`;
      const imageUrl = await uploadFile(file, filePath);
      await updateUserProfile(usuarioFirebase, {
        photoURL: imageUrl,
      });
      setFotoPerfil(imageUrl);
    } catch (error) {
      setErro(t("userProfile.uploadError"));
    } finally {
      setCarregando(false);
    }
  };

  const handleSalvarNome = async (e) => {
    e.preventDefault();
    setErroNome("");
    console.log("[handleSalvarNome] Iniciando atualização de nome");
    console.log("Novo nome:", novoNome, "Novo sobrenome:", novoSobrenome);
    if (!novoNome.trim() || !novoSobrenome.trim()) {
      setErroNome(
        t("userProfile.nameRequired") || "Nome e sobrenome obrigatórios"
      );
      console.log("[handleSalvarNome] Nome ou sobrenome vazio");
      return;
    }
    if (novoNome.length < 2 || novoSobrenome.length < 2) {
      setErroNome(
        t("userProfile.nameTooShort") ||
          "Nome e sobrenome devem ter pelo menos 2 letras"
      );
      console.log("[handleSalvarNome] Nome ou sobrenome muito curto");
      return;
    }
    setSalvandoNome(true);
    try {
      console.log("[handleSalvarNome] usuarioFirebase:", usuarioFirebase);
      const db = getFirestore();
      const userRef = doc(db, "usuarios", usuarioFirebase.uid);
      await updateDoc(userRef, {
        nome: `${novoNome.trim()} ${novoSobrenome.trim()}`,
      });
      console.log(
        "[handleSalvarNome] Nome atualizado com sucesso no Firestore"
      );
      setEditandoNome(false);
      setErroNome("");
    } catch (error) {
      console.error("[handleSalvarNome] Erro ao atualizar nome:", error);
      setErroNome(t("userProfile.updateNameError") || "Erro ao atualizar nome");
    } finally {
      setSalvandoNome(false);
      console.log("[handleSalvarNome] Fim do processo de atualização de nome");
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
    <div className="bg-cinza-escuro rounded-xl flex flex-col  md:w-50 p-3">
      <InfoUsuario
        fotoPerfil={fotoPerfil}
        onTrocarFoto={handleTrocarFoto}
        fileInputRef={fileInputRef}
        handleFileChange={handleFileChange}
        usuarioFirebase={usuarioFirebase}
        t={t}
        editandoNome={editandoNome}
        setEditandoNome={setEditandoNome}
        novoNome={novoNome}
        setNovoNome={setNovoNome}
        novoSobrenome={novoSobrenome}
        setNovoSobrenome={setNovoSobrenome}
        erroNome={erroNome}
        salvandoNome={salvandoNome}
        handleSalvarNome={handleSalvarNome}
        emailSpotify={emailSpotify}
      />
      {erro && <div className="mt-2 text-xs text-red-500">{erro}</div>}
      <StatusContaUsuario t={t} handleLogout={handleLogout} />
    </div>
  );
}
