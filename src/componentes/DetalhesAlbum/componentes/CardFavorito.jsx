import React from "react";
import { IoMdHeart } from "react-icons/io";

const CardFavorito = ({
  faixaFavorita,
  piorFaixa,
  faixas,
  onChange,
  t,
  className = "",
}) => (
  <div className={`bg-gray-800 p-2 rounded-lg ${className}`}>
    <h4 className="text-xs font-medium text-red-500 flex items-center gap-1 mb-1">
      <IoMdHeart className="inline text-xs" /> {t("albumDetails.favoriteTrack")}
      :
    </h4>
    <select
      className="w-full bg-gray-700 text-white py-1 px-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-red-500 text-ellipsis"
      value={faixaFavorita === null ? "nao_aplica" : faixaFavorita || ""}
      onChange={onChange}
    >
      <option value="" disabled>
        {t("albumDetails.selectTrack", "Selecione a música...")}
      </option>
      {faixas.items.map((faixa) => (
        <option
          key={`fav-${faixa.id}`}
          value={faixa.id}
          disabled={faixa.id === piorFaixa}
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

export default CardFavorito;
