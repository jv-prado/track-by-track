import React from "react";

const PopoverTop3 = ({
  mostrar,
  popoverRef,
  t,
  faixasFavoritasGlobais = [],
  faixasPioresGlobais = [],
}) => {
  if (!mostrar) return null;
  return (
    <div
      ref={popoverRef}
      className="z-50 fixed left-1/2 top-auto bottom-auto mt-10 -translate-x-1/2 lg:absolute lg:left-0 lg:right-auto lg:top-full lg:mt-2 lg:translate-x-0 lg:translate-y-0"
    >
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-lg p-3 min-w-[220px] max-w-[90vw]">
        <div className="flex flex-col md:flex-row gap-3 max-h-[250px] overflow-y-auto">
          <div className="flex flex-col items-start min-w-[120px] md:pr-4 md:border-r md:border-gray-700">
            <span className="text-xs text-green-400 font-extrabold mb-2 ">
              {t("albumDetails.topFavorites")}
            </span>
            {faixasFavoritasGlobais.length > 0 ? (
              faixasFavoritasGlobais.map((faixa, idx) => (
                <span
                  key={faixa.id}
                  className="flex items-center w-full justify-between gap-2 text-xs text-gray-200"
                >
                  <span className="flex items-center min-w-0">
                    <span className="text-green-300 font-bold mr-1">
                      {idx + 1}º
                    </span>
                    <span className="truncate flex-1">{faixa.nome}</span>
                  </span>
                  <span className="ml-1 text-green-200 font-bold flex-shrink-0">
                    {faixa.percentual}%
                  </span>
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-400 italic">
                {t("albumDetails.notRatedYet")}
              </span>
            )}
          </div>
          <div className="flex flex-col items-start min-w-[120px] md:pl-4">
            <span className="text-xs text-red-400 font-extrabold mb-2">
              {t("albumDetails.topWorst")}
            </span>
            {faixasPioresGlobais.length > 0 ? (
              faixasPioresGlobais.map((faixa, idx) => (
                <span
                  key={faixa.id}
                  className="flex items-center w-full justify-between gap-2 text-xs text-gray-200"
                >
                  <span className="flex items-center min-w-0">
                    <span className="text-red-300 font-bold mr-1">
                      {idx + 1}º
                    </span>
                    <span className="truncate flex-1">{faixa.nome}</span>
                  </span>
                  <span className="ml-1 text-red-200 font-bold flex-shrink-0">
                    {faixa.percentual}%
                  </span>
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-400 italic">
                {t("albumDetails.notRatedYet")}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PopoverTop3;
