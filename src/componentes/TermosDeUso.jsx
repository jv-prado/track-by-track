import React from "react";
import { useTranslation } from "react-i18next";

export default function TermosDeUso() {
  const { t } = useTranslation();

  return (
    <div className="p-6 w-full flex justify-center">
      <div className="bg-cinza-escuro p-6 rounded-xl w-full max-w-2xl">
        <h1 className="text-2xl text-white font-bold mb-4 text-center">
          {t("termsOfUse.title")}
        </h1>
        <p className="text-gray-200 mb-2">{t("termsOfUse.agreement")}</p>
        <p className="text-gray-200 mb-2">{t("termsOfUse.prohibited")}</p>
        <p className="text-gray-200 mb-2">{t("termsOfUse.breach")}</p>
        <p className="text-gray-200 mb-2">{t("termsOfUse.updates")}</p>
      </div>
    </div>
  );
}
