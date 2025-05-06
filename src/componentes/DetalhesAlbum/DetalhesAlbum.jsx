import React from "react";
import useDetalhesAlbumPage from "./hooks/useDetalhesAlbumPage";
import BarraAcoesAlbum from "./componentes/BarraAcoesAlbum";
import HeaderAlbumCompleto from "./componentes/HeaderAlbumCompleto";
import ModaisAlbum from "./componentes/ModaisAlbum";
import BlocoCardsAlbum from "./componentes/BlocoCardsAlbum";
import ListaFaixas from "./componentes/ListaFaixas";
import Overlay from "./componentes/Overlay";
import Carregamento from "../Feedback/Carregamento";
import { ReviewsUsuariosAlbum } from "./componentes";

const DetalhesAlbum = ({ albumId: albumIdProp, onVoltar: onVoltarProp }) => {
  const {
    t,
    detalhesAlbum,
    faixas,
    carregando,
    erro,
    tentarNovamente,
    avaliacoes,
    faixaFavorita,
    piorFaixa,
    progressoAvaliacao,
    datasAvaliacao,
    setAvaliacoes,
    setFaixaFavorita,
    setPiorFaixa,
    setProgressoAvaliacao,
    setDatasAvaliacao,
    review,
    setReview,
    salvandoReview,
    mostrarModalReview,
    setMostrarModalReview,
    salvarReview,
    temReviewExistente,
    mediaGlobal,
    faixasFavoritasGlobais,
    faixasPioresGlobais,
    avaliacoesUsuariosAlbum,
    mostrarPopover,
    setMostrarPopover,
    popoverRef,
    mostrarPopoverMedia,
    setMostrarPopoverMedia,
    popoverMediaRef,
    avaliarFaixa,
    marcarFaixaFavorita,
    marcarPiorFaixa,
    resetarAvaliacoesAlbum,
    removerAlbum,
    cancelarAcao,
    mostrarConfirmacao,
    setMostrarConfirmacao,
    calcularDuracaoTotal,
    obterCorNota,
    formatarDuracao,
    calcularMediaAvaliacoes,
    formatarData,
    onVoltar,
  } = useDetalhesAlbumPage(albumIdProp, onVoltarProp);

  if (carregando) {
    return <Carregamento />;
  }

  if (erro) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 mb-4">{erro}</p>
        <button
          onClick={tentarNovamente}
          className="bg-verde-destaque hover:bg-verde-destaque/80 text-white font-bold py-2 px-6 rounded-full focus:outline-none focus:shadow-outline transition-all cursor-pointer"
        >
          {t("tryAgain")}
        </button>
      </div>
    );
  }

  if (!detalhesAlbum || !faixas) {
    return (
      <div className="p-3 md:p-6 overflow-hidden">
        <p className="text-center text-gray-400 text-base md:text-lg">
          {t("albumDetails.loadError")}
        </p>
      </div>
    );
  }

  return (
    <div className="p-1 sm:p-2 md:p-4 max-w-full overflow-hidden">
      {/* Barra de ações: voltar, resetar, remover */}
      <BarraAcoesAlbum
        onVoltar={onVoltar}
        onResetar={resetarAvaliacoesAlbum}
        onRemover={removerAlbum}
      />
      {/* Modais */}
      <ModaisAlbum
        mostrarModalReview={mostrarModalReview}
        review={review}
        setReview={setReview}
        salvandoReview={salvandoReview}
        temReviewExistente={temReviewExistente}
        onSalvarReview={salvarReview}
        onFecharReview={() => setMostrarModalReview(false)}
        mostrarConfirmacao={mostrarConfirmacao}
        tipoConfirmacao={mostrarConfirmacao}
        onCancelarConfirmacao={cancelarAcao}
        onConfirmarReset={resetarAvaliacoesAlbum}
        onConfirmarRemover={removerAlbum}
        t={t}
      />
      {/* Bloco principal: cabeçalho, nota, progresso e cards lado a lado em desktop */}
      <div className="flex flex-col lg:flex-row gap-3 lg:gap-6 mb-3 lg:mb-6">
        {/* Esquerda: Cabeçalho, nota, progresso - sempre juntos */}
        <div className="flex flex-col w-full md:mr-10">
          <HeaderAlbumCompleto
            detalhesAlbum={detalhesAlbum}
            faixas={faixas}
            calcularDuracaoTotal={calcularDuracaoTotal}
            temReviewExistente={temReviewExistente}
            setMostrarModalReview={setMostrarModalReview}
            mediaGlobal={mediaGlobal}
            setMostrarPopoverMedia={setMostrarPopoverMedia}
            mostrarPopoverMedia={mostrarPopoverMedia}
            popoverMediaRef={popoverMediaRef}
            t={t}
            avaliacoesUsuariosAlbum={avaliacoesUsuariosAlbum}
            setMostrarPopover={setMostrarPopover}
            mostrarPopover={mostrarPopover}
            popoverRef={popoverRef}
            faixasFavoritasGlobais={faixasFavoritasGlobais}
            faixasPioresGlobais={faixasPioresGlobais}
            calcularMediaAvaliacoes={calcularMediaAvaliacoes}
            avaliacoes={avaliacoes}
            progressoAvaliacao={progressoAvaliacao}
          />
        </div>
        {/* Direita: Cards de favorito, pior música e histórico (apenas em telas grandes) */}
        <div className="hidden 2xl:flex mt-0 flex-col justify-start text-left ml-auto min-w-[180px] max-w-[220px] flex-shrink-0">
          <BlocoCardsAlbum
            faixaFavorita={faixaFavorita}
            piorFaixa={piorFaixa}
            faixas={faixas}
            marcarFaixaFavorita={marcarFaixaFavorita}
            marcarPiorFaixa={marcarPiorFaixa}
            datasAvaliacao={datasAvaliacao}
            formatarData={formatarData}
            t={t}
          />
        </div>
      </div>
      {/* Lista de faixas */}
      <ListaFaixas
        faixas={faixas}
        avaliacoes={avaliacoes}
        avaliarFaixa={avaliarFaixa}
        formatarDuracao={formatarDuracao}
      />
      {/* Reviews dos usuários para o álbum */}
      {/* Cards de favorito, pior música e histórico - versão mobile/tablet */}
      <BlocoCardsAlbum
        faixaFavorita={faixaFavorita}
        piorFaixa={piorFaixa}
        faixas={faixas}
        marcarFaixaFavorita={marcarFaixaFavorita}
        marcarPiorFaixa={marcarPiorFaixa}
        datasAvaliacao={datasAvaliacao}
        formatarData={formatarData}
        t={t}
        className="grid grid-cols-1 xs:grid-cols-2 gap-3 mt-3 2xl:hidden"
        cardFavoritoClass="min-w-[160px]"
        cardPiorClass="min-w-[160px]"
        cardHistoricoClass="xs:col-span-2"
      />
      {/* Overlay de modal para popovers em mobile e desktop */}
      <Overlay
        mostrar={mostrarPopover || mostrarPopoverMedia}
        onClick={() => {
          setMostrarPopover(false);
          setMostrarPopoverMedia(false);
        }}
      />
    </div>
  );
};

export default DetalhesAlbum;
