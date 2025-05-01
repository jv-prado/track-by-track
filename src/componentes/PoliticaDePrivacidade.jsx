import React from "react";
import { useTranslation } from "react-i18next";

export default function PoliticaDePrivacidade() {
  const { t } = useTranslation();

  return (
    <div className="p-6 w-full flex justify-center">
      <div className="bg-cinza-escuro p-6 rounded-xl w-full max-w-2xl">
        <h1 className="text-2xl text-white font-bold mb-4 text-center">
          {t("privacyPolicy.title")}
        </h1>
        <p className="text-gray-200 mb-2">{t("privacyPolicy.intro")}</p>
        <p className="text-gray-200 mb-2">{t("privacyPolicy.dataUsage")}</p>
        <p className="text-gray-200 mb-2">{t("privacyPolicy.dataSharing")}</p>
        <p className="text-gray-200 mb-2">{t("privacyPolicy.support")}</p>
      </div>
    </div>
  );
}
