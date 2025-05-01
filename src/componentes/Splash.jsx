import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Logo from "./sidebar/assets/Logo.svg";
import { useTranslation } from "react-i18next";
import BandeiraBrasil from "../assets/Flag_of_Brazil.svg";
import BandeiraEUA from "../assets/Flag_of_the_United_States.svg";
import { FaInstagram } from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../services/firebase";

const Splash = () => {
  const navigate = useNavigate();
  const [animationComplete, setAnimationComplete] = useState(false);
  const { t, i18n } = useTranslation();
  const { usuario: usuarioFirebase, usuarioDemo } = useAuth();

  // Efeito de digitação para a descrição
  const [descriptionLines, setDescriptionLines] = useState([
    t("splash.description1", "Descubra novos álbuns."),
    t("splash.description2", "Avalie faixa por faixa."),
    t("splash.description3", "Registre tudo em um só lugar."),
  ]);
  const [typedLines, setTypedLines] = useState(["", "", ""]);
  const [currentLine, setCurrentLine] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  // Atualiza as linhas de descrição quando o idioma mudar
  useEffect(() => {
    setDescriptionLines([
      t("splash.description1", "Descubra novos álbuns."),
      t("splash.description2", "Avalie faixa por faixa."),
      t("splash.description3", "Registre tudo em um só lugar."),
    ]);
    setTypedLines(["", "", ""]);
    setCurrentLine(0);
    setCharIndex(0);
  }, [i18n.language, t]);

  useEffect(() => {
    let timeout;
    if (currentLine < descriptionLines.length) {
      if (charIndex < descriptionLines[currentLine].length) {
        timeout = setTimeout(() => {
          setTypedLines((prev) => {
            const newLines = [...prev];
            newLines[currentLine] = descriptionLines[currentLine].slice(
              0,
              charIndex + 1
            );
            return newLines;
          });
          setCharIndex((prev) => prev + 1);
        }, 28);
      } else {
        timeout = setTimeout(() => {
          setCurrentLine((prev) => prev + 1);
          setCharIndex(0);
        }, 350);
      }
    }
    return () => clearTimeout(timeout);
  }, [charIndex, currentLine, descriptionLines]);

  // Verificar se o usuário já está autenticado ao carregar a splash screen
  useEffect(() => {
    const verificarAutenticacao = async () => {
      // Verificar autenticação do Firebase
      const usuarioAtual = auth.currentUser;

      // Verificar usuário demo
      const demoToken = localStorage.getItem("demo_token");
      const demoExpiry = localStorage.getItem("demo_token_expiry");
      const modoDemo =
        demoToken && demoExpiry && parseInt(demoExpiry) > Date.now();

      if (usuarioAtual || usuarioFirebase || usuarioDemo || modoDemo) {
        console.log("Splash: Usuário já autenticado, redirecionando para feed");
        // Definir feed como tela ativa
        localStorage.setItem("activeView", "feed");
        // Redirecionar para o feed
        setAnimationComplete(true);
        setTimeout(() => {
          navigate("/feed", { replace: true });
        }, 300);
      }
    };

    verificarAutenticacao();
  }, [navigate, usuarioFirebase, usuarioDemo]);

  const handleContinue = () => {
    setAnimationComplete(true);
    setTimeout(() => {
      navigate("/login");
    }, 300);
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("i18nextLng", lng);
  };

  const currentLanguage = i18n.language || "pt-BR";
  const isPortuguese = currentLanguage.startsWith("pt");

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black p-4 transition-opacity duration-500 ${
        animationComplete ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="text-center max-w-md mx-auto">
        <div className="mb-8">
          <img
            src={Logo}
            alt={t("splash.logoAlt", "Logo do aplicativo")}
            className="w-40 md:w-56 lg:w-64 animate-float hover:animate-none relative z-10 mx-auto"
          />
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-verde-destaque mb-6 animate-fadeIn text-center">
          Track by Track
        </h1>

        <p
          className="text-gray-300 mb-8 animate-fadeIn w-80 text-center mx-auto leading-relaxed min-h-[90px]"
          style={{ animationDelay: "0.3s" }}
        >
          <span className="block mb-1">
            {typedLines[0]}
            {currentLine === 0 && <span className="animate-pulse">|</span>}
          </span>
          <span className="block mb-1">
            {typedLines[1]}
            {currentLine === 1 && <span className="animate-pulse">|</span>}
          </span>
          <span className="block">
            {typedLines[2]}
            {currentLine === 2 && <span className="animate-pulse">|</span>}
          </span>
        </p>

        <div
          className="animate-fadeIn mb-6 text-center"
          style={{ animationDelay: "0.6s" }}
        >
          <button
            onClick={handleContinue}
            className="bg-verde-destaque text-gray-900 font-bold py-3 px-8 rounded-full hover:bg-opacity-90 transition-all transform hover:scale-105 cursor-pointer"
          >
            {t("splash.enterButton", "Entrar ou Cadastrar")}
          </button>
        </div>

        {/* Instagram - Splash Screen */}
        <div
          className="flex justify-center mt-5 mb-6 animate-fadeIn text-center"
          style={{ animationDelay: "0.75s" }}
        >
          <a
            href="https://www.instagram.com/trackbytrackapp"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600/90 to-pink-500/90 hover:from-purple-500 hover:to-pink-400 transition-all duration-300 group hover:shadow-md hover:shadow-pink-500/20 hover:scale-105"
            title="Siga-nos no Instagram"
            style={{ textDecoration: "none" }}
          >
            <FaInstagram className="text-white" />
            <span className="text-white text-sm font-medium pr-1">
              Instagram
            </span>
          </a>
        </div>
        {/* Fim Instagram - Splash Screen */}

        {/* Seletor de idioma simplificado com bandeiras - Apenas para dispositivos móveis */}
        <div
          className="flex justify-center items-center gap-6 mt-6 animate-fadeIn text-center"
          style={{ animationDelay: "0.9s" }}
        >
          {/* Bandeira do Brasil */}
          <button
            onClick={() => changeLanguage("pt-BR")}
            className={`w-12 h-8 rounded-md overflow-hidden border-2 transition-all cursor-pointer ${
              isPortuguese
                ? "border-verde-destaque scale-110"
                : "border-gray-600 opacity-80 hover:opacity-100"
            }`}
            title="Português"
          >
            <img
              src={BandeiraBrasil}
              alt="Bandeira do Brasil"
              className="w-full h-full object-cover"
            />
          </button>

          {/* Bandeira dos EUA */}
          <button
            onClick={() => changeLanguage("en-US")}
            className={`w-12 h-8 rounded-md overflow-hidden border-2 transition-all cursor-pointer ${
              !isPortuguese
                ? "border-verde-destaque scale-110"
                : "border-gray-600 opacity-80 hover:opacity-100"
            }`}
            title="English"
          >
            <img
              src={BandeiraEUA}
              alt="Bandeira dos EUA"
              className="w-full h-full object-cover"
            />
          </button>
        </div>

        {/* Links para Política de Privacidade e Termos de Uso */}
        <div
          className="flex justify-center items-center gap-4 mt-8 animate-fadeIn text-center"
          style={{ animationDelay: "1s" }}
        >
          <Link
            to="/politica-de-privacidade"
            className="text-gray-400 text-xs hover:text-verde-destaque transition-colors"
          >
            {t("privacyPolicy.title")}
          </Link>
          <span className="text-gray-600">|</span>
          <Link
            to="/termos-de-uso"
            className="text-gray-400 text-xs hover:text-verde-destaque transition-colors"
          >
            {t("termsOfUse.title")}
          </Link>
          <span className="text-gray-600">|</span>
          <Link
            to="/exclusao-de-conta"
            className="text-gray-400 text-xs hover:text-verde-destaque transition-colors"
          >
            {t("accountDeletion.title")}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Splash;
