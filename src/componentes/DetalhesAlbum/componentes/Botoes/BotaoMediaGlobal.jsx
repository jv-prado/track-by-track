import React from "react";

const BotaoMediaGlobal = ({
  mediaGlobal,
  onClick,
  obterCorNota,
  t,
  disabled = false,
}) => (
  <button
    type="button"
    className={`min-h-[39px] bg-gray-900 rounded px-1.5 py-1 flex items-center gap-0.5 shadow-md text-[11px] sm:px-2 sm:py-1 sm:gap-1 border border-gray-700 transition align-middle cursor-pointer focus:outline-none focus:ring-2 focus:ring-verde-destaque ${
      mediaGlobal === null || disabled
        ? "opacity-50 cursor-not-allowed"
        : "hover:bg-gray-800"
    }`}
    onClick={onClick}
    tabIndex={0}
    aria-label="Ver notas dos usuários"
    disabled={mediaGlobal === null || disabled}
  >
    <span className="text-[10px] sm:text-xs text-gray-300 font-medium">
      {t("albumDetails.globalAverage")}
    </span>
    <span className="flex items-center">
      {mediaGlobal !== null ? (
        <>
          <span
            className={`text-base sm:text-lg font-bold ${obterCorNota(
              mediaGlobal
            )}`}
          >
            {Number.isInteger(mediaGlobal)
              ? mediaGlobal
              : mediaGlobal.toFixed(1)}
          </span>
          <span className="text-[10px] sm:text-xs text-gray-400 px-1">
            / 10
          </span>
        </>
      ) : (
        <span className="text-xs text-gray-400 italic">
          {t("albumDetails.notRatedYet")}
        </span>
      )}
    </span>
  </button>
);

export default BotaoMediaGlobal;
