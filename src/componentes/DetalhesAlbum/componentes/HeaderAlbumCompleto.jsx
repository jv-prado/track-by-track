import React from "react";
import CabecalhoAlbum from "./CabecalhoAlbum";
import BotaoReview from "../../UI/Botoes/BotaoReview";
import BotaoSpotify from "../../UI/Botoes/BotaoSpotify";
import NotaAlbum from "./NotaAlbum";
import BarraProgresso from "./BarraProgresso";

const HeaderAlbumCompleto = ({
  detalhesAlbum,
  faixas,
  calcularDuracaoTotal,
  temReviewExistente,
  setMostrarModalReview,
  calcularMediaAvaliacoes,
  avaliacoes,
  progressoAvaliacao,
}) => {
  // Garantir nova referência para evitar problemas com reatividade
  const progressoCopy = progressoAvaliacao
    ? { ...progressoAvaliacao }
    : { avaliadas: 0, total: 0, percentual: 0 };

  return (
    <CabecalhoAlbum
      detalhesAlbum={detalhesAlbum}
      faixas={faixas}
      calcularDuracaoTotal={calcularDuracaoTotal}
    >
      <div className="flex gap-2  justify-center md:justify-start mt-2">
        <BotaoReview
          temReviewExistente={temReviewExistente}
          onAbrirReview={() => setMostrarModalReview(true)}
          detalhesAlbum={detalhesAlbum}
        />
        <BotaoSpotify detalhesAlbum={detalhesAlbum} />
      </div>
      <NotaAlbum
        nota={calcularMediaAvaliacoes(faixas, avaliacoes)}
        percentualProgresso={progressoAvaliacao?.percentual || 0}
      />
      <BarraProgresso progressoAvaliacao={progressoCopy} />
    </CabecalhoAlbum>
  );
};

export default HeaderAlbumCompleto;
