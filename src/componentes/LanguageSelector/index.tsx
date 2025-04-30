import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import BandeiraBrasil from "../../assets/Flag_of_Brazil.svg";
import BandeiraEUA from "../../assets/Flag_of_the_United_States.svg";

const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const [isHovering, setIsHovering] = useState(false);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("i18nextLng", lng);
  };

  const currentLanguage = i18n.language || "pt-BR";
  const isPortuguese = currentLanguage.startsWith("pt");

  return (
    <div
      style={{
        position: "fixed",
        right: "20px",
        bottom: "30px",
        zIndex: 9999,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Menu de seleção de idioma - visível apenas ao passar o mouse */}
      {isHovering && (
        <div
          className="language-options"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginBottom: "15px",
            animation: "fadeIn 0.3s ease-in-out",
          }}
        >
          {/* Botão de idioma inglês */}
          {isPortuguese && (
            <button
              onClick={() => changeLanguage("en-US")}
              style={{
                width: "55px",
                height: "55px",
                backgroundColor: "#1A1A1A",
                color: "#FFF",
                borderRadius: "50%",
                border: "3px solid #444",
                fontSize: "25px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 5px 15px rgba(0,0,0,0.5)",
                cursor: "pointer",
                transition: "transform 0.2s, border-color 0.2s",
                overflow: "hidden",
                padding: "2px",
              }}
              className="hover-scale"
              title="English"
            >
              <img
                src={BandeiraEUA}
                alt="USA Flag"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "50%",
                }}
              />
            </button>
          )}

          {/* Botão de idioma português */}
          {!isPortuguese && (
            <button
              onClick={() => changeLanguage("pt-BR")}
              style={{
                width: "55px",
                height: "55px",
                backgroundColor: "#1A1A1A",
                color: "#FFF",
                borderRadius: "50%",
                border: "3px solid #444",
                fontSize: "25px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 5px 15px rgba(0,0,0,0.5)",
                cursor: "pointer",
                transition: "transform 0.2s, border-color 0.2s",
                overflow: "hidden",
                padding: "2px",
              }}
              className="hover-scale"
              title="Português"
            >
              <img
                src={BandeiraBrasil}
                alt="Brazil Flag"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "50%",
                }}
              />
            </button>
          )}
        </div>
      )}

      {/* Botão principal de idioma - sempre visível */}
      <div
        style={{
          position: "relative",
          transition: "transform 0.3s",
          transform: isHovering ? "scale(1.1)" : "scale(1)",
        }}
      >
        <button
          style={{
            width: "70px",
            height: "70px",
            backgroundColor: "#81fe88",
            color: "#000",
            borderRadius: "50%",
            border: "3px solid #000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 5px 15px rgba(0,0,0,0.5)",
            cursor: "pointer",
            transition: "all 0.3s ease",
            overflow: "hidden",
            padding: "3px",
          }}
          title={isPortuguese ? "Português" : "English"}
        >
          <img
            src={isPortuguese ? BandeiraBrasil : BandeiraEUA}
            alt={isPortuguese ? "Brazil Flag" : "USA Flag"}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: "50%",
            }}
          />
        </button>
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          .hover-scale:hover {
            transform: scale(1.1);
            border-color: #81fe88;
          }
        `}
      </style>
    </div>
  );
};

export default LanguageSelector;
