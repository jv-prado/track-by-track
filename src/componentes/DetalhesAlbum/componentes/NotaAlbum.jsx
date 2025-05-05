import React from "react";
import { obterCorNota } from "../utils";

/**
 * Componente que exibe a nota do álbum
 * @param {Object} props - Propriedades do componente
 * @param {number} props.nota - Nota do álbum (0-10)
 * @param {number} props.percentualProgresso - Percentual do progresso de avaliação (0-100)
 */
const NotaAlbum = ({ nota, percentualProgresso }) => {
  const classeNota = (() => {
    if (percentualProgresso < 100)
      return "text-2xl sm:text-3xl font-extrabold font-extrabold text-gray-400";
    return `text-2xl sm:text-3xl font-extrabold ${obterCorNota(nota)}`;
  })();

  const notaFormatada = Number.isInteger(nota) ? nota : nota.toFixed(1);

  return (
    <div className="flex w-full justify-center lg:justify-start mt-2">
      <div className="flex flex-col items-center">
        <span className={classeNota}>
          {notaFormatada}
          <span className="text-base sm:text-xl text-gray-400 font-normal ml-1">
            /10
          </span>
        </span>
      </div>
    </div>
  );
};

export default NotaAlbum;
