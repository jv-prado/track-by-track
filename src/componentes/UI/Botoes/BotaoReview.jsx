import React from "react";
import { MdRateReview } from "react-icons/md";

const BotaoReview = ({ temReviewExistente, onAbrirReview, detalhesAlbum }) => (
  <button
    className="cursor-pointer flex items-center gap-1 bg-indigo-700 hover:bg-indigo-600 text-white text-xs px-3 py-1 rounded-lg transition-colors font-medium mb-1"
    onClick={onAbrirReview}
    title={temReviewExistente ? "Editar review" : "Adicionar review"}
    type="button"
  >
    <MdRateReview className="inline text-base" />
    {temReviewExistente ? "Editar Review" : "Review"}
  </button>
);

export default BotaoReview;
