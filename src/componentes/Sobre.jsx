import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { IoArrowBack } from "react-icons/io5";
import { FaSpotify } from "react-icons/fa";

export default function Sobre() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleVoltar = () => {
    navigate(-1);
  };

  return (
    <div className="p-6 w-full flex flex-col justify-center">
      {/* Botão de voltar apenas para dispositivos móveis */}
      <div className="md:hidden mb-4">
        <button
          onClick={handleVoltar}
          className="flex items-center bg-cinza py-2 px-4 rounded-lg hover:bg-cinza-escuro transition-colors"
        >
          <IoArrowBack className="mr-2" />
          {t("albumDetails.back", "Voltar")}
        </button>
      </div>

      <div className="bg-cinza-escuro p-6 rounded-xl w-full max-w-3xl mx-auto">
        <h1 className="text-2xl text-white font-bold mb-4 text-center">
          {t("about.title")}
        </h1>

        <p className="text-gray-200 mb-4">{t("about.description")}</p>
        <p className="text-gray-200 mb-6">{t("about.purpose")}</p>

        <h2 className="text-xl text-verde-destaque font-semibold mb-3 flex items-center">
          <FaSpotify className="mr-2" /> {t("about.spotifyIntegration")}
        </h2>
        <p className="text-gray-200 mb-2">{t("about.spotifyDescription")}</p>
        <p className="text-gray-200 mb-6 text-sm italic">
          {t("about.disclaimer")}
        </p>

        <h2 className="text-xl text-verde-destaque font-semibold mb-3">
          {t("about.features")}
        </h2>
        <ul className="list-disc pl-6 mb-6 text-gray-200">
          {t("about.featuresList", { returnObjects: true }).map(
            (feature, index) => (
              <li key={`feature-${index}`} className="mb-1">
                {feature}
              </li>
            )
          )}
        </ul>

        <div className="mt-8 pt-4 border-t border-gray-700">
          <p className="text-gray-300 text-center mb-2">{t("about.contact")}</p>
          <p className="text-verde-destaque text-center mb-6 font-semibold">
            {t("about.email")}
          </p>
          <p className="text-gray-400 text-center text-sm italic">
            {t("about.developedBy")}
          </p>
        </div>
      </div>
    </div>
  );
}
