import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "./sidebar/assets/Logo.svg";
import { useTranslation } from "react-i18next";
import BandeiraBrasil from "./sidebar/assets/Flag_of_Brazil.svg";
import BandeiraEUA from "./sidebar/assets/Flag_of_the_United_States.svg";

const Splash = () => {
  const navigate = useNavigate();
  const [animationComplete, setAnimationComplete] = useState(false);
  const { t, i18n } = useTranslation();

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
      <div className="text-center max-w-md">
        <div className="mb-8">
          <img
            src={Logo}
            alt={t("splash.logoAlt", "Logo do aplicativo")}
            className="w-40 md:w-56 lg:w-64 animate-float hover:animate-none relative z-10 mx-auto"
          />
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-verde-destaque mb-6 animate-fadeIn">
          Track by Track
        </h1>

        <p
          className="text-gray-300 mb-8 animate-fadeIn w-80"
          style={{ animationDelay: "0.3s" }}
        >
          {t(
            "splash.description",
            "Seu app para descobrir, avaliar e registrar todos os álbuns que você ouvir."
          )}
        </p>

        <div className="animate-fadeIn mb-6" style={{ animationDelay: "0.6s" }}>
          <button
            onClick={handleContinue}
            className="bg-verde-destaque text-gray-900 font-bold py-3 px-8 rounded-full hover:bg-opacity-90 transition-all transform hover:scale-105 cursor-pointer"
          >
            {t("splash.enterButton", "Entrar ou Cadastrar")}
          </button>
        </div>

        {/* Seletor de idioma simplificado com bandeiras - Apenas para dispositivos móveis */}
        <div
          className=" flex justify-center items-center gap-6 mt-6 animate-fadeIn"
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
      </div>
    </div>
  );
};

export default Splash;
