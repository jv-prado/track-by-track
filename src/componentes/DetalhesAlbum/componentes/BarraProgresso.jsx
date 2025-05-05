import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";

/**
 * Componente que exibe a barra de progresso das avaliações do álbum
 * @param {Object} props - Propriedades do componente
 * @param {Object} props.progressoAvaliacao - Objeto com informações de progresso (avaliadas, total, percentual)
 */
const BarraProgresso = ({ progressoAvaliacao }) => {
  const { t } = useTranslation();

  // Efeito para forçar a re-renderização quando o progresso mudar
  useEffect(() => {
    // Este efeito garante que o componente reaja a alterações no progressoAvaliacao
  }, [progressoAvaliacao?.avaliadas, progressoAvaliacao?.percentual]);

  return (
    <div className="mt-1 md:mt-0">
      <div className="w-full max-w-[80vw] mx-auto xs:max-w-[180px] md:max-w-full">
        <div className="flex justify-between mb-1 gap-1 xs:gap-1.5 text-center md:text-left">
          <span className="text-[10px] xs:text-xs md:text-sm text-gray-400">
            {t("albumDetails.ratingProgress")}
          </span>
          <span className="text-[10px] xs:text-xs md:text-sm text-gray-400">
            {progressoAvaliacao?.avaliadas || 0}/
            {progressoAvaliacao?.total || 0} (
            {Math.floor(progressoAvaliacao?.percentual || 0)}%)
          </span>
        </div>
      </div>
      <div className="w-full max-w-[80vw] mx-auto xs:max-w-[180px] md:max-w-full md:ml-0 h-1.5 xs:h-2 md:h-2.5 lg:h-3 xl:h-3 bg-cinza/70 xs:bg-cinza rounded-full overflow-hidden relative">
        <div
          key={`progresso-${progressoAvaliacao?.avaliadas || 0}-${
            progressoAvaliacao?.percentual || 0
          }`}
          className={`h-full transition-all duration-300 ease-in-out ${
            Math.floor(progressoAvaliacao?.percentual || 0) >= 100
              ? "bg-verde-destaque"
              : "bg-blue-500/50"
          }`}
          style={{
            width: `${Math.floor(progressoAvaliacao?.percentual || 0)}%`,
          }}
        ></div>
      </div>
    </div>
  );
};

export default BarraProgresso;
