import React from "react";
import { useTranslation } from "react-i18next";

/**
 * Componente que exibe o cabeçalho de um álbum com imagem, título, artista e informações básicas
 * @param {Object} props - Propriedades do componente
 * @param {Object} props.detalhesAlbum - Detalhes do álbum (nome, artistas, imagens, data de lançamento)
 * @param {Object} props.faixas - Lista de faixas do álbum
 * @param {Function} props.calcularDuracaoTotal - Função para calcular a duração total do álbum
 * @param {React.ReactNode} props.children - Elementos filhos a serem renderizados dentro do bloco de informações
 */
const CabecalhoAlbum = ({
  detalhesAlbum,
  faixas,
  calcularDuracaoTotal,
  children,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col lg:flex-row gap-3 lg:gap-6 mb-3 lg:mb-6">
      {/* Capa do álbum */}
      <div className="flex-shrink-0 mx-auto lg:mx-0 flex items-center justify-center">
        {detalhesAlbum.images && detalhesAlbum.images.length > 0 && (
          <img
            src={detalhesAlbum.images[0].url}
            alt={`${detalhesAlbum.name}`}
            className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 lg:w-60 lg:h-60 object-cover rounded-lg shadow-xl border-2 border-gray-700 transition-transform duration-300 hover:scale-105 hover:shadow-2xl"
            style={{ aspectRatio: "1 / 1", background: "#18181b" }}
          />
        )}
      </div>

      {/* Informações do álbum */}
      <div className="flex flex-col mt-0 lg:mt-0 flex-grow min-w-0">
        <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-verde-destaque mb-0.5 text-center lg:text-left truncate">
          {detalhesAlbum.name}
        </h2>
        <p className="text-base sm:text-lg md:text-xl mb-0.5 text-center lg:text-left truncate">
          {detalhesAlbum.artists.map((a) => a.name).join(", ")}
        </p>
        <p className="mb-0.5 text-gray-400 text-center lg:text-left text-xs sm:text-sm md:text-base">
          {t("albumDetails.releaseInfo", {
            year: detalhesAlbum.release_date.substring(0, 4),
            tracks: faixas.items.length,
            duration: calcularDuracaoTotal(faixas),
          })}
        </p>
        {/* Renderizar children (nota, progresso, etc) aqui */}
        {children}
      </div>
    </div>
  );
};

export default CabecalhoAlbum;
