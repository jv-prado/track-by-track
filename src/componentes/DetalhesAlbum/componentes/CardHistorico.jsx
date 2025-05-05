import React from "react";

const CardHistorico = ({ datasAvaliacao, formatarData, t, className = "" }) => (
  <div className={`bg-gray-800 p-2 rounded-lg ${className}`}>
    <h4 className="text-xs font-medium text-blue-400 flex items-center gap-1 mb-1">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-3 w-3 inline"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      {t("albumDetails.history")}:
    </h4>
    <div className="text-xs text-gray-400 mb-1">
      <span className="font-medium">{t("albumDetails.firstRating")}:</span>
      <div className="text-gray-300">
        {datasAvaliacao.temRegistro
          ? formatarData(datasAvaliacao.primeira)
          : t("albumDetails.noRecord")}
      </div>
    </div>
    <div className="text-xs text-gray-400">
      <span className="font-medium">{t("albumDetails.lastModification")}:</span>
      <div className="text-gray-300">
        {datasAvaliacao.temRegistro
          ? formatarData(datasAvaliacao.ultima)
          : t("albumDetails.noRecord")}
      </div>
    </div>
  </div>
);

export default CardHistorico;
