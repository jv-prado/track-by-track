import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { IoArrowBack } from "react-icons/io5";

export default function PoliticaDePrivacidade() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleVoltar = () => {
    navigate(-1);
  };

  return (
    <div className="p-6 w-full flex flex-col justify-center">
      {/* Botão de voltar apenas para dispositivos móveis */}
      <div className="md:hidden mb-4 flex justify-center">
        <button
          onClick={handleVoltar}
          className="flex items-center gap-2 bg-cinza-escuro hover:bg-cinza text-white px-6 py-3 rounded-lg shadow font-semibold text-base transition-colors cursor-pointer border border-gray-700"
        >
          <IoArrowBack className="text-lg" />
          {t("albumDetails.back", "Voltar")}
        </button>
      </div>

      <div className="bg-cinza-escuro p-6 rounded-xl w-full max-w-2xl mx-auto">
        <h1 className="text-2xl text-white font-bold mb-4 text-center">
          {t("privacyPolicy.title")}
        </h1>
        <p className="text-gray-200 mb-2">{t("privacyPolicy.intro")}</p>
        <p className="text-gray-200 mb-2">{t("privacyPolicy.dataUsage")}</p>
        <p className="text-gray-200 mb-2">{t("privacyPolicy.dataSharing")}</p>
        <p className="text-gray-200 mb-2">{t("privacyPolicy.support")}</p>
      </div>

      <div className="flex justify-center mt-8">
        <button
          onClick={() => navigate(-1)}
          className="bg-cinza-escuro hover:bg-cinza text-white px-6 py-3 rounded-lg shadow font-semibold text-base transition-colors cursor-pointer border border-gray-700 flex items-center gap-2"
        >
          <IoArrowBack className="text-lg" />
          {t("albumDetails.back", "Voltar")}
        </button>
      </div>
    </div>
  );
}
