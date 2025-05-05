import React from "react";
import { MdRateReview } from "react-icons/md";
import { FaSpotify } from "react-icons/fa";
import { useTranslation } from "react-i18next";

/**
 * Componente para os botões de review e ouvir no Spotify
 * @param {Object} props
 * @param {boolean} props.temReviewExistente - Se já existe review
 * @param {Function} props.onAbrirReview - Função para abrir o modal de review
 * @param {Object} props.detalhesAlbum - Objeto com detalhes do álbum
 */
const BotoesReviewSpotify = ({
  temReviewExistente,
  onAbrirReview,
  detalhesAlbum,
}) => {
  const { t } = useTranslation();
  return (
    <div className="mt-2 md:mt-3 flex flex-col gap-2 w-full">
      <div className="flex w-full justify-center lg:justify-start gap-2">
        <button
          onClick={onAbrirReview}
          className="bg-indigo-700 hover:bg-indigo-600 text-white py-1 px-2 rounded-lg transition-colors text-xs sm:text-sm flex items-center gap-1 cursor-pointer"
          title={
            temReviewExistente
              ? t("albumDetails.editReviewButton")
              : t("albumDetails.writeReviewButton")
          }
        >
          <MdRateReview className="text-xs" />
          <span className="sm:inline">
            {temReviewExistente
              ? t("albumDetails.editReviewButton")
              : t("albumDetails.writeReviewButton")}
          </span>
        </button>
        <a
          href={
            detalhesAlbum.external_urls?.spotify ||
            `https://open.spotify.com/album/${detalhesAlbum.id}`
          }
          target="_blank"
          rel="noopener noreferrer"
          className="bg-green-600 hover:bg-green-500 text-white py-1.5 px-3 text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-all duration-300 shadow-md hover:shadow-lg rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          <FaSpotify className="text-base sm:text-lg" />
          {t("albumDetails.listenOnSpotify")}
        </a>
      </div>
    </div>
  );
};

export default BotoesReviewSpotify;
