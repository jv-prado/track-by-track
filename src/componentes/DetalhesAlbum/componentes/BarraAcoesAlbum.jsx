import React from "react";
import BotaoVoltar from "../../UI/Botoes/BotaoVoltar";
import BotoesAcao from "../../UI/Botoes/BotoesAcao";

const BarraAcoesAlbum = ({ onVoltar, onResetar, onRemover }) => (
  <div className="flex justify-between w-full items-center mb-2 md:mb-4">
    <BotaoVoltar onClick={onVoltar} />
    <BotoesAcao onResetar={onResetar} onRemover={onRemover} />
  </div>
);

export default BarraAcoesAlbum;
