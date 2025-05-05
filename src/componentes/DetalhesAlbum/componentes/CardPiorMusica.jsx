import React from "react";
import { IoMdHeartDislike } from "react-icons/io";

const CardPiorMusica = ({
  piorFaixa,
  faixaFavorita,
  faixas,
  onChange,
  t,
  className = "",
}) => (
  <div className={`bg-gray-800 p-2 rounded-lg ${className}`}>
    <h4 className="text-xs font-medium text-yellow-500 flex items-center gap-1 mb-1">
      <IoMdHeartDislike className="inline text-xs" />{" "}
      {t("albumDetails.worstTrack")}:
    </h4>
    <select
      className="w-full bg-gray-700 text-white py-1 px-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500 text-ellipsis"
      value={piorFaixa === null ? "nao_aplica" : piorFaixa || ""}
      onChange={onChange}
    >
      <option value="" disabled>
        {t("albumDetails.selectTrack", "Selecione a música...")}
      </option>
      {faixas.items.map((faixa) => (
        <option
          key={`worst-${faixa.id}`}
          value={faixa.id}
          disabled={faixa.id === faixaFavorita}
        >
          {faixa.name.length > 30
            ? faixa.name.substring(0, 28) + "..."
            : faixa.name}
        </option>
      ))}
      <option value="nao_aplica">
        {t("albumDetails.notApplicable", "Não se aplica")}
      </option>
    </select>
  </div>
);

export default CardPiorMusica;
