import React from "react";
import { FaTrash, FaUndo } from "react-icons/fa";
import { useTranslation } from "react-i18next";

/**
 * Componente que exibe os botões de ação para o álbum (resetar avaliações e remover álbum)
 * @param {Object} props - Propriedades do componente
 * @param {Function} props.onResetar - Função para resetar as avaliações do álbum
 * @param {Function} props.onRemover - Função para remover o álbum
 */
const BotoesAcao = ({ onResetar, onRemover }) => {
  const { t } = useTranslation();

  return (
    <div className="flex gap-1 sm:gap-2 items-center sm:items-end">
      <button
        onClick={onResetar}
        className="bg-gray-700 hover:bg-gray-600 text-white py-1 px-2 rounded-lg transition-colors text-xs sm:text-sm flex items-center gap-1 cursor-pointer"
        title={t("albumDetails.reset")}
      >
        <FaUndo className="text-xs" />
        <span className="hidden sm:inline">{t("albumDetails.reset")}</span>
      </button>

      <button
        onClick={onRemover}
        className="bg-red-900 hover:bg-red-800 text-white py-1 px-2 rounded-lg transition-colors text-xs sm:text-sm flex items-center gap-1 cursor-pointer"
        title={t("albumDetails.remove")}
      >
        <FaTrash className="text-xs" />
        <span className="hidden sm:inline">{t("albumDetails.remove")}</span>
      </button>
    </div>
  );
};

export default BotoesAcao;
