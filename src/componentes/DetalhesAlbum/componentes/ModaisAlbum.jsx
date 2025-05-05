import React from "react";
import ModalReview from "./Modais/ModalReview";
import ModalConfirmacao from "./Modais/ModalConfirmacao";

const ModaisAlbum = ({
  mostrarModalReview,
  review,
  setReview,
  salvandoReview,
  temReviewExistente,
  onSalvarReview,
  onFecharReview,
  mostrarConfirmacao,
  tipoConfirmacao,
  onCancelarConfirmacao,
  onConfirmarReset,
  onConfirmarRemover,
  t,
}) => {
  return (
    <>
      <ModalReview
        mostrar={mostrarModalReview}
        review={review}
        setReview={setReview}
        salvandoReview={salvandoReview}
        temReviewExistente={temReviewExistente}
        onSalvar={onSalvarReview}
        onFechar={onFecharReview}
        t={t}
      />
      <ModalConfirmacao
        mostrar={!!mostrarConfirmacao}
        tipo={tipoConfirmacao}
        onCancelar={onCancelarConfirmacao}
        onConfirmar={
          tipoConfirmacao === "resetar" ? onConfirmarReset : onConfirmarRemover
        }
        t={t}
      />
    </>
  );
};

export default ModaisAlbum;
