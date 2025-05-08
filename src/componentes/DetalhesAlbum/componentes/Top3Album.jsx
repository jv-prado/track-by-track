import React from "react";
import BotaoTop3 from "./Botoes/BotaoTop3";
import PopoverTop3 from "./Botoes/PopoverTop3";

const Top3Album = ({
  setMostrarPopover,
  mostrarPopover,
  popoverRef,
  t,
  faixasFavoritasGlobais,
  faixasPioresGlobais,
}) => (
  <div className="relative inline-block">
    <BotaoTop3 onClick={() => setMostrarPopover((v) => !v)} t={t} />
    <PopoverTop3
      mostrar={mostrarPopover}
      popoverRef={popoverRef}
      t={t}
      faixasFavoritasGlobais={faixasFavoritasGlobais}
      faixasPioresGlobais={faixasPioresGlobais}
    />
  </div>
);

export default Top3Album;
