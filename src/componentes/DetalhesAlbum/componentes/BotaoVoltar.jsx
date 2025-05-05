import React from "react";
import { useTranslation } from "react-i18next";

/**
 * Componente que exibe o botão de voltar
 * @param {Object} props - Propriedades do componente
 * @param {Function} props.onClick - Função a ser chamada quando o botão for clicado
 */
const BotaoVoltar = ({ onClick }) => {
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      className="bg-cinza py-1 px-3 rounded-lg hover:bg-cinza-escuro transition-colors text-xs sm:text-sm cursor-pointer"
    >
      {t("albumDetails.back")}
    </button>
  );
};

export default BotaoVoltar;
