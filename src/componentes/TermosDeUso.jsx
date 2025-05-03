import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { IoArrowBack } from "react-icons/io5";

export default function TermosDeUso() {
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

      <div className="bg-cinza-escuro p-6 rounded-xl w-full max-w-2xl mx-auto">
        <h1 className="text-2xl text-white font-bold mb-4 text-center">
          {t("termsOfUse.title")}
        </h1>
        <p className="text-gray-200 mb-2">{t("termsOfUse.agreement")}</p>
        <p className="text-gray-200 mb-2">{t("termsOfUse.prohibited")}</p>
        <p className="text-gray-200 mb-2">{t("termsOfUse.breach")}</p>
        <p className="text-gray-200 mb-2">{t("termsOfUse.updates")}</p>
      </div>

      <button
        onClick={() => navigate(-1)}
        className="mt-8 mx-auto bg-cinza-escuro text-white px-6 py-2 rounded-lg shadow hover:bg-cinza transition-colors cursor-pointer"
      >
        {t("albumDetails.back", "Voltar")}
      </button>
    </div>
  );
}
