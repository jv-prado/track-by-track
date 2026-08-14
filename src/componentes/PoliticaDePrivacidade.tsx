import { useTranslation } from "react-i18next";
import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export default function PoliticaDePrivacidade() {
  const { t } = useTranslation();
  const router = useRouter();

  const handleVoltar = () => {
    // se a página foi aberta direto (link compartilhado, nova aba), não há pra onde
    // voltar dentro do app — history.back() vira no-op silencioso nesse caso.
    if (window.history.length > 1) window.history.back();
    else router.navigate({ to: "/feed" });
  };

  return (
    <div className="p-6 w-full flex flex-col justify-center">
      {/* Botão de voltar apenas para dispositivos móveis */}
      <div className="md:hidden mb-4 flex justify-center">
        <button
          onClick={handleVoltar}
          className="flex items-center gap-2 bg-cinza-escuro hover:bg-cinza text-white px-6 py-3 rounded-lg shadow font-semibold text-base transition-colors cursor-pointer border border-gray-700"
        >
          <ArrowLeft className="text-lg" size={18} />
          {t("common.back")}
        </button>
      </div>

      <div className="bg-cinza-escuro p-6 rounded-xl w-full max-w-2xl mx-auto">
        <h1 className="text-xl sm:text-2xl text-white font-bold mb-4 text-center">
          {t("privacyPolicy.title")}
        </h1>
        <p className="text-gray-200 mb-2">{t("privacyPolicy.intro")}</p>
        <p className="text-gray-200 mb-2">{t("privacyPolicy.dataUsage")}</p>
        <p className="text-gray-200 mb-2">{t("privacyPolicy.dataSharing")}</p>
        <p className="text-gray-200 mb-2">{t("privacyPolicy.support")}</p>
      </div>

      <div className="flex justify-center mt-8">
        <button
          onClick={handleVoltar}
          className="bg-cinza-escuro hover:bg-cinza text-white px-6 py-3 rounded-lg shadow font-semibold text-base transition-colors cursor-pointer border border-gray-700 flex items-center gap-2"
        >
          <ArrowLeft className="text-lg" size={18} />
          {t("common.back")}
        </button>
      </div>
    </div>
  );
}
