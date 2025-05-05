import React from "react";
import { GiPodium } from "react-icons/gi";

const BotaoTop3 = ({ onClick, t }) => (
  <button
    type="button"
    className="min-h-[39px] bg-gray-900 rounded px-1.5 py-1 flex items-center justify-center gap-0.5 shadow-md text-[11px] sm:px-2 sm:py-1 sm:gap-1 border border-gray-700 hover:bg-gray-800 transition align-middle cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-400"
    onClick={onClick}
    tabIndex={0}
    aria-label="Ver Top 3 favoritas/piores"
  >
    <GiPodium className="text-yellow-400 text-base" />
    <span className="text-[10px] sm:text-xs p-1.5 text-gray-300 font-bold">
      Top 3
    </span>
  </button>
);

export default BotaoTop3;
