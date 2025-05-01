import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { IoArrowBack } from "react-icons/io5";
import { MdEmail } from "react-icons/md";

export default function ExclusaoDeConta() {
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
          {t("accountDeletion.title")}
        </h1>

        <p className="text-gray-200 mb-4">{t("accountDeletion.description")}</p>

        <p className="text-gray-200 mb-2">
          {t("accountDeletion.instructions")}
        </p>

        <div className="bg-cinza-medio p-4 rounded-lg flex items-center justify-center my-4">
          <MdEmail className="text-verde-destaque text-xl mr-2" />
          <a
            href={`mailto:${t("accountDeletion.emailContact")}`}
            className="text-verde-destaque hover:underline"
          >
            {t("accountDeletion.emailContact")}
          </a>
        </div>

        <h2 className="text-xl text-white font-semibold mt-6 mb-2">
          {t("accountDeletion.dataDeleted")}
        </h2>
        <ul className="list-disc pl-6 mb-4 text-gray-200">
          {t("accountDeletion.deleteItems", { returnObjects: true }).map(
            (item, index) => (
              <li key={`delete-${index}`} className="mb-1">
                {item}
              </li>
            )
          )}
        </ul>

        <h2 className="text-xl text-white font-semibold mt-4 mb-2">
          {t("accountDeletion.dataKept")}
        </h2>
        <ul className="list-disc pl-6 mb-4 text-gray-200">
          {t("accountDeletion.keptItems", { returnObjects: true }).map(
            (item, index) => (
              <li key={`kept-${index}`} className="mb-1">
                {item}
              </li>
            )
          )}
        </ul>

        <p className="text-gray-200 mt-6 border-t border-gray-700 pt-4">
          {t("accountDeletion.timeframe")}
        </p>

        <p className="text-gray-200 mt-4 bg-gray-800 p-3 rounded-lg">
          {t("accountDeletion.demo")}
        </p>
      </div>
    </div>
  );
}
