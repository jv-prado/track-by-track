import React from "react";
import CabecalhoAlbum from "./CabecalhoAlbum";
import BotaoReview from "../../UI/Botoes/BotaoReview";
import BotaoSpotify from "../../UI/Botoes/BotaoSpotify";
import NotaAlbum from "./NotaAlbum";
import BarraProgresso from "./BarraProgresso";
import MediaGlobalAlbum from "./MediaGlobalAlbum";
import Top3Album from "./Top3Album";

const HeaderAlbumCompleto = ({
  detalhesAlbum,
  faixas,
  calcularDuracaoTotal,
  temReviewExistente,
  setMostrarModalReview,
  calcularMediaAvaliacoes,
  avaliacoes,
  progressoAvaliacao,
  mediaGlobal,
  setMostrarPopoverMedia,
  mostrarPopoverMedia,
  popoverMediaRef,
  t,
  obterCorNota,
  avaliacoesUsuariosAlbum,
  setMostrarPopover,
  mostrarPopover,
  popoverRef,
  faixasFavoritasGlobais,
  faixasPioresGlobais,
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
      <div className="flex gap-2 justify-center md:justify-start mt-2">
        <MediaGlobalAlbum
          mediaGlobal={mediaGlobal}
          setMostrarPopoverMedia={setMostrarPopoverMedia}
          mostrarPopoverMedia={mostrarPopoverMedia}
          popoverMediaRef={popoverMediaRef}
          t={t}
          obterCorNota={obterCorNota}
          avaliacoesUsuariosAlbum={avaliacoesUsuariosAlbum}
        />
        <Top3Album
          setMostrarPopover={setMostrarPopover}
          mostrarPopover={mostrarPopover}
          popoverRef={popoverRef}
          t={t}
          faixasFavoritasGlobais={faixasFavoritasGlobais}
          faixasPioresGlobais={faixasPioresGlobais}
        />
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
