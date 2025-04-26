import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "./sidebar/assets/Logo.svg";

const Splash = () => {
  const navigate = useNavigate();
  const [animationComplete, setAnimationComplete] = useState(false);

  const handleContinue = () => {
    setAnimationComplete(true);
    setTimeout(() => {
      navigate("/login");
    }, 300);
  };

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
            alt="Logo do aplicativo"
            className="w-40 md:w-56 lg:w-64 animate-float hover:animate-none relative z-10 mx-auto"
          />
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-verde-destaque mb-6 animate-fadeIn">
          Track by Track
        </h1>

        <p
          className="text-gray-300 mb-12 animate-fadeIn"
          style={{ animationDelay: "0.3s" }}
        >
          Seu aplicativo para descobrir, avaliar e acompanhar suas músicas
          favoritas. Organize suas avaliações faixa por faixa e construa sua
          biblioteca musical personalizada.
        </p>

        <div className="animate-fadeIn" style={{ animationDelay: "0.6s" }}>
          <button
            onClick={handleContinue}
            className="bg-verde-destaque text-gray-900 font-bold py-3 px-8 rounded-full hover:bg-opacity-90 transition-all transform hover:scale-105"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
};

export default Splash;
