import React from "react";
import { MdRateReview } from "react-icons/md";

const ModalReview = ({
  mostrar,
  review,
  setReview,
  salvandoReview,
  temReviewExistente,
  onSalvar,
  onFechar,
  t,
}) => {
  if (!mostrar) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] px-4">
      <div className="bg-cinza-escuro rounded-xl p-5 max-w-md w-full">
        <h3 className="text-lg font-bold text-indigo-400 mb-3 flex items-center gap-2">
          <MdRateReview />
          {t("albumDetails.albumReview", "Album Review")}
        </h3>

        <textarea
          className="w-full h-40 bg-gray-800 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
          placeholder={t(
            "albumDetails.writeReview",
            "Write your review about this album..."
          )}
          value={review}
          onChange={(e) => setReview(e.target.value)}
          disabled={salvandoReview}
        />

        <div className="flex justify-end gap-3">
          <button
            onClick={onFechar}
            className="bg-gray-700 py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
            disabled={salvandoReview}
          >
            {t("albumDetails.cancel")}
          </button>
          <button
            onClick={onSalvar}
            className="bg-indigo-700 hover:bg-indigo-600 text-white py-2 px-4 rounded-lg transition-colors cursor-pointer"
            disabled={salvandoReview}
          >
            {salvandoReview
              ? t("albumDetails.saving", "Salvando...")
              : temReviewExistente
              ? t("albumDetails.updateReview", "Atualizar Review")
              : t("albumDetails.saveReview", "Salvar Review")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalReview;
