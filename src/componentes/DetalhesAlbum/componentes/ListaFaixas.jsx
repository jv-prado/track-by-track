import React from "react";
import { useTranslation } from "react-i18next";
import Estrelas from "../../Avaliacao/Estrelas";

/**
 * Componente que exibe a lista de faixas do álbum
 * @param {Object} props - Propriedades do componente
 * @param {Object} props.faixas - Lista de faixas do álbum
 * @param {Object} props.avaliacoes - Avaliações das faixas
 * @param {Function} props.avaliarFaixa - Função para avaliar uma faixa
 * @param {Function} props.formatarDuracao - Função para formatar a duração da faixa
 */
const ListaFaixas = ({ faixas, avaliacoes, avaliarFaixa, formatarDuracao }) => {
  const { t } = useTranslation();

  if (!faixas || !faixas.items || faixas.items.length === 0) {
    return (
      <div className="bg-cinza-escuro rounded-xl p-2 md:p-4 overflow-hidden mb-3">
        <h3 className="text-base md:text-2xl font-bold mb-2 md:mb-3">
          {t("albumDetails.tracks")}
        </h3>
        <p className="text-center text-gray-400 text-base md:text-lg">
          {t("albumDetails.noTracksFound")}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-cinza-escuro rounded-xl p-2 md:p-4 overflow-hidden mb-3">
      <h3 className="text-base md:text-2xl font-bold mb-2 md:mb-3">
        {t("albumDetails.tracks")}
      </h3>

      <div className="w-full relative">
        {/* Mobile view - sem tempo */}
        <div className="xs:hidden">
          {/* Cabeçalho */}
          <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_5.5rem] gap-x-1 mb-2">
            <div className="font-bold text-gray-400 text-center text-xs">#</div>
            <div className="font-bold text-gray-400 text-xs">
              {t("albumDetails.title")}
            </div>
            <div className="font-bold text-gray-400 ml-5 md:ml-3 text-xs pr-1">
              {t("albumDetails.rating")}
            </div>
          </div>

          {/* Linhas de faixas */}
          {faixas.items.map((faixa, index) => (
            <div
              key={faixa.id}
              className="grid grid-cols-[1.5rem_minmax(0,1fr)_5.5rem] gap-x-1 py-1.5 border-t border-gray-800"
            >
              <div className="text-gray-400 text-center text-xs self-center">
                {index + 1}
              </div>
              {(() => {
                // Script para definir o maxWidth conforme o tamanho da tela (5 breakpoints)
                let maxWidth = "120px";
                const largura = window.innerWidth;
                if (largura < 400) {
                  maxWidth = "47vw";
                } else if (largura < 600) {
                  maxWidth = "50vw";
                } else if (largura < 900) {
                  maxWidth = "50vw";
                } else if (largura < 1200) {
                  maxWidth = "27vw";
                } else {
                  maxWidth = "60vw";
                }
                return (
                  <div
                    className="truncate pr-1 mr-8 text-xs sm:text-sm self-center font-medium"
                    style={{ maxWidth }}
                  >
                    {faixa.name}
                  </div>
                );
              })()}
              <div className="flex justify-end items-center pr-1">
                <Estrelas
                  avaliacao={avaliacoes[faixa.id] || 0}
                  onChange={(estrelas) => avaliarFaixa(faixa.id, estrelas)}
                  tamanho="medio"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Tablet/Desktop view - com tempo */}
        <div className="hidden xs:block">
          {/* Cabeçalho */}
          <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_3rem_5.5rem] gap-x-1 sm:gap-x-2 mb-2">
            <div className="font-bold text-gray-400 text-center text-xs">#</div>
            <div className="font-bold text-gray-400 text-xs">
              {t("albumDetails.title")}
            </div>
            <div className="font-bold text-gray-400 text-center text-xs">
              {t("albumDetails.time")}
            </div>
            <div className="font-bold text-gray-400 text-center text-xs pr-1">
              {t("albumDetails.rating")}
            </div>
          </div>

          {/* Linhas de faixas */}
          {faixas.items.map((faixa, index) => (
            <div
              key={faixa.id}
              className="grid grid-cols-[1.5rem_minmax(0,1fr)_3rem_5.5rem] gap-x-1 sm:gap-x-2 py-1.5 border-t border-gray-800"
            >
              <div className="text-gray-400 text-center text-xs self-center">
                {index + 1}
              </div>
              <div className="truncate pr-1 text-xs sm:text-sm self-center font-medium">
                {faixa.name}
              </div>
              <div className="text-gray-400 text-center text-xs self-center">
                {formatarDuracao(faixa.duration_ms)}
              </div>
              <div className="flex justify-end items-center pr-1">
                <Estrelas
                  avaliacao={avaliacoes[faixa.id] || 0}
                  onChange={(estrelas) => avaliarFaixa(faixa.id, estrelas)}
                  tamanho="medio"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ListaFaixas;
