import React from "react";
import { MdRateReview } from "react-icons/md";
import { useTranslation } from "react-i18next";

const BotaoReview = ({ temReviewExistente, onAbrirReview, detalhesAlbum }) => {
  const { t } = useTranslation();
  return (
    <button
      className="cursor-pointer flex items-center gap-1 bg-indigo-700 hover:bg-indigo-600 text-white text-xs px-3 py-1 rounded-lg transition-colors font-medium mb-1"
      onClick={onAbrirReview}
      title={temReviewExistente ? t("review.editTitle") : t("review.addTitle")}
      type="button"
    >
      <MdRateReview className="inline text-base" />
      {temReviewExistente ? t("review.editButton") : t("review.writeButton")}
    </button>
  );
};

export default BotaoReview;
