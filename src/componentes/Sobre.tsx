import { useTranslation } from "react-i18next";
import { useRouter } from "@tanstack/react-router";
import { ArrowLeft, Music } from "lucide-react";

export default function Sobre() {
  const { t } = useTranslation();
  const router = useRouter();

  const handleVoltar = () => {
    // se a página foi aberta direto (link compartilhado, nova aba), não há pra onde
    // voltar dentro do app — history.back() vira no-op silencioso nesse caso.
    if (window.history.length > 1) window.history.back();
    else router.navigate({ to: "/" });
  };

  const featuresList = t("about.featuresList", { returnObjects: true }) as string[];

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

      <div className="bg-cinza-escuro p-6 rounded-xl w-full max-w-3xl mx-auto">
        <h1 className="text-2xl text-white font-bold mb-4 text-center">{t("about.title")}</h1>

        <p className="text-gray-200 mb-4">{t("about.description")}</p>
        <p className="text-gray-200 mb-6">{t("about.purpose")}</p>

        <h2 className="text-xl text-dourado font-semibold mb-3 flex items-center">
          <Music className="mr-2" size={18} /> {t("about.spotifyIntegration")}
        </h2>
        <p className="text-gray-200 mb-2">{t("about.spotifyDescription")}</p>
        <p className="text-gray-200 mb-6 text-sm italic">{t("about.disclaimer")}</p>

        <h2 className="text-xl text-dourado font-semibold mb-3">{t("about.features")}</h2>
        <ul className="list-disc pl-6 mb-6 text-gray-200">
          {featuresList.map((feature, index) => (
            <li key={`feature-${index}`} className="mb-1">
              {feature}
            </li>
          ))}
        </ul>

        <div className="mt-8 pt-4 border-t border-gray-700">
          <p className="text-gray-300 text-center mb-2">{t("about.contact")}</p>
          <p className="text-dourado text-center mb-6 font-semibold">{t("about.email")}</p>
          <p className="text-gray-400 text-center text-sm italic">{t("about.developedBy")}</p>
        </div>
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
