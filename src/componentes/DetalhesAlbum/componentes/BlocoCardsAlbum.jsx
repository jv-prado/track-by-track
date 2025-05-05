import React from "react";
import CardFavorito from "./CardFavorito";
import CardPiorMusica from "./CardPiorMusica";
import CardHistorico from "./CardHistorico";

const BlocoCardsAlbum = ({
  faixaFavorita,
  piorFaixa,
  faixas,
  marcarFaixaFavorita,
  marcarPiorFaixa,
  datasAvaliacao,
  formatarData,
  t,
  className = "",
  cardFavoritoClass = "",
  cardPiorClass = "",
  cardHistoricoClass = "",
}) => (
  <div className={`flex flex-col gap-3 ${className}`}>
    <CardFavorito
      faixaFavorita={faixaFavorita}
      piorFaixa={piorFaixa}
      faixas={faixas}
      onChange={(e) => {
        if (e.target.value === "nao_aplica") {
          marcarFaixaFavorita(null);
        } else {
          marcarFaixaFavorita(
            e.target.value === "" ? undefined : e.target.value
          );
        }
      }}
      t={t}
      className={cardFavoritoClass}
    />
    <CardPiorMusica
      piorFaixa={piorFaixa}
      faixaFavorita={faixaFavorita}
      faixas={faixas}
      onChange={(e) => {
        if (e.target.value === "nao_aplica") {
          marcarPiorFaixa(null);
        } else {
          marcarPiorFaixa(e.target.value === "" ? undefined : e.target.value);
        }
      }}
      t={t}
      className={cardPiorClass}
    />
    <CardHistorico
      datasAvaliacao={datasAvaliacao}
      formatarData={formatarData}
      t={t}
      className={cardHistoricoClass}
    />
  </div>
);

export default BlocoCardsAlbum;
