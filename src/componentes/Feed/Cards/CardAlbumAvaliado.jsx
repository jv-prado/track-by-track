import { MdReportProblem, MdMusicNote } from "react-icons/md";
import { useTranslation } from "react-i18next";
import useDetalhesAlbumPage from "../../DetalhesAlbum/hooks/useDetalhesAlbumPage";
import useDetalhesAlbum from "../../DetalhesAlbum/hooks/useDetalhesAlbum";
import { useState } from "react";

/**
 * Componente que exibe um cartão de álbum avaliado
 *
 * @param {Object} props - Propriedades do componente
 * @param {Object} props.album - Dados do álbum a ser exibido
 * @param {Function} props.setAlbumSelecionado - Função para definir um álbum como selecionado
 * @param {string} props.modo - Modo de exibição do cartão (padrão ou lista)
 * @returns {JSX.Element} Componente de cartão de álbum
 */
const CardAlbumAvaliado = ({ album, setAlbumSelecionado, modo = "grade" }) => {
  const { t } = useTranslation();
  const {
    detalhesAlbum,
    progressoAvaliacao: progressoAvaliacaoHook,
    carregando,
    erro,
  } = useDetalhesAlbumPage(album.id);

  // Usar detalhes do hook, mas fallback para album enquanto carrega
  const info = detalhesAlbum || album;
  const progressoAvaliacao = progressoAvaliacaoHook ||
    album.progressoAvaliacao || {
      avaliadas: 0,
      total: 0,
      percentual: 0,
    };

  // Formatar o percentual como número inteiro
  const percentualFormatado = Math.floor(progressoAvaliacao.percentual);

  // Estado para controlar o carregamento da imagem
  const [imgOk, setImgOk] = useState(true);

  if (modo === "lista") {
    // Layout horizontal (lista)
    return (
      <div
        key={album.id}
        className={`bg-cinza-escuro rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex flex-row h-full cursor-pointer relative hover:bg-cinza-escuro/90 group p-3`}
        onClick={() => setAlbumSelecionado(album.id)}
      >
        {/* Imagem */}
        <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 bg-cinza-escuro rounded-lg overflow-hidden mx-2 flex items-center justify-center">
          {info.images && info.images.length > 0 && imgOk ? (
            <img
              src={info.images[0].url}
              alt={t("albumCard.coverAlt", { albumName: info.name })}
              className="w-full h-full object-cover rounded-lg"
              onError={() => setImgOk(false)}
              onLoad={() => setImgOk(true)}
            />
          ) : null}
        </div>
        {/* Informações */}
        <div className="flex-grow min-w-0 mx-2 flex flex-col justify-center">
          <div className="flex justify-between items-start">
            <div>
              <h3
                className="font-bold text-sm md:text-base lg:text-lg text-white truncate overflow-hidden whitespace-nowrap pr-1"
                style={{
                  maxWidth:
                    typeof window !== "undefined" && window.innerWidth < 430
                      ? "150px"
                      : typeof window !== "undefined" &&
                        window.innerWidth < 1000
                      ? "180px"
                      : typeof window !== "undefined" &&
                        window.innerWidth < 1300
                      ? "260px"
                      : typeof window !== "undefined" &&
                        window.innerWidth < 1500
                      ? "320px"
                      : "600px",
                }}
                title={info.name}
              >
                {info.name}
              </h3>
              <p className="text-verde-destaque text-xs md:text-sm line-clamp-1 font-medium truncate pr-1">
                {info.artists &&
                info.artists.map((a) => a.name).join(", ").length > 28
                  ? info.artists
                      .map((a) => a.name)
                      .join(", ")
                      .substring(0, 25) + "..."
                  : info.artists?.map((a) => a.name).join(", ") ||
                    t("albumCard.unknownArtist")}
              </p>
            </div>
            {/* Nota compacta */}
            <div
              className={`${(() => {
                if (progressoAvaliacao && progressoAvaliacao.percentual < 100) {
                  return "bg-gray-400";
                }
                const nota = parseFloat(detalhesAlbum?.mediaAvaliacao || 0);
                if (nota < 4) return "bg-red-500";
                if (nota < 7) return "bg-yellow-500";
                return "bg-verde-destaque";
              })()} text-cinza-escuro rounded-lg px-3 py-1 md:px-4 md:py-2 text-lg md:text-2xl lg:text-3xl font-bold flex items-center shadow-sm`}
            >
              {detalhesAlbum?.mediaAvaliacao
                ? Number.isInteger(detalhesAlbum.mediaAvaliacao)
                  ? detalhesAlbum.mediaAvaliacao.toString()
                  : detalhesAlbum.mediaAvaliacao.toFixed(1)
                : "0"}
            </div>
          </div>

          {/* Progresso e botão do Spotify em linha */}
          <div className="flex items-center mt-2 md:mt-3 gap-2 justify-between">
            {/* Progresso compacto */}
            {progressoAvaliacao && (
              <div className="flex-grow max-w-xl">
                <div className="w-full h-1.5 md:h-1.5 bg-cinza rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ease-in-out ${
                      progressoAvaliacao.percentual >= 100
                        ? "bg-verde-destaque"
                        : "bg-blue-500/50"
                    }`}
                    style={{
                      width: `${Math.floor(progressoAvaliacao.percentual)}%`,
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-0.5 md:mt-1">
                  <span>{Math.floor(progressoAvaliacao.percentual)}%</span>
                  <span>
                    {progressoAvaliacao.avaliadas}/{progressoAvaliacao.total}
                  </span>
                </div>
              </div>
            )}

            {/* Botão do Spotify */}
            {((info.external_urls && info.external_urls.spotify) ||
              info.id) && (
              <a
                href={
                  info.external_urls && info.external_urls.spotify
                    ? info.external_urls.spotify
                    : `https://open.spotify.com/album/${info.id}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center bg-black/30 rounded text-xs md:text-xs text-gray-300 hover:text-green-400 hover:bg-black/50 transition-colors z-20 relative flex-shrink-0
                  ${
                    typeof window !== "undefined" && window.innerWidth < 1000
                      ? "px-1.5 py-0.5 h-7 text-[11px]"
                      : "px-2 py-1 md:px-3 md:py-1.5"
                  }
                `}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-green-400 mr-1">
                  <svg
                    stroke="currentColor"
                    fill="currentColor"
                    strokeWidth="0"
                    viewBox="0 0 448 512"
                    height="1em"
                    width="1em"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M224 0C100.3 0 0 100.3 0 224c0 123.76 100.3 224 224 224 123.76 0 224-100.24 224-224C448 100.3 347.76 0 224 0zm93.77 328.46c-3.94 5.2-11.1 6.37-16.4 2.14-45.12-27.48-101.7-33.73-168.45-18.44-6.52 1.34-13.4-2.78-14.95-9.47-1.5-6.62 2.83-13.4 9.44-14.94 73.25-16.72 136.2-9.59 187.13 21.5 5.26 3.2 6.38 10.5 3.23 15.38zm25.08-56.3c-5 6.9-14.25 8.34-21.1 3.5-51.65-31.62-130.34-40.9-191.46-22.33-7.83 2.3-16.08-2.1-18.5-9.92-2.27-7.8 2.1-16.1 9.92-18.36 69.68-21.14 156.2-10.8 216.27 25.9 6.9 4.9 8.34 14.3 3.5 21.2zm2.2-55.8c-62.62-37.1-166.04-40.9-225.92-22.73-9.4 2.9-19.3-2.4-22.2-11.8-2.85-9.4 2.43-19.8 11.8-22.2 68.5-20.9 182.6-16.8 253.8 25.7 8.5 5.05 11.46 16.0 6.45 24.6-5.03 8.63-15.97 11.6-24.57 6.6z"></path>
                  </svg>
                </span>
                <span className="whitespace-nowrap">
                  {typeof window !== "undefined" && window.innerWidth < 1000
                    ? "Spotify"
                    : t("feed.ouvirSpotify")}
                </span>
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Layout vertical (grade)
  return (
    <div
      key={album.id}
      className={`flex flex-col bg-cinza-escuro rounded-xl p-3 hover:bg-cinza transition-all duration-300 transform hover:scale-105 cursor-pointer ${
        erro || album.erro ? "border border-red-500" : ""
      }`}
      onClick={() => setAlbumSelecionado(album.id)}
    >
      {/* Imagem do álbum */}
      <div className="w-full aspect-square bg-cinza flex items-center justify-center rounded-lg shadow-lg mb-3">
        {info.images && info.images.length > 0 && imgOk ? (
          <img
            src={info.images[0].url}
            alt={t("albumCard.coverAlt", { albumName: info.name })}
            className="w-full h-auto aspect-square object-cover rounded-lg shadow-lg"
            onError={() => setImgOk(false)}
            onLoad={() => setImgOk(true)}
          />
        ) : null}
      </div>

      {/* Informações do álbum */}
      <h3 className="font-bold text-sm md:text-base mb-1 line-clamp-2">
        {info.name}
      </h3>
      <p className="text-verde-destaque text-xs md:text-sm mb-1 line-clamp-1">
        {info.artists?.map((a) => a.name).join(", ") ||
          t("albumCard.unknownArtist")}
      </p>

      {/* Informações de avaliação */}
      <div className="mt-auto">
        {/* Nota média e botão Spotify alinhados */}
        <div className="flex items-center justify-between mt-2 mb-1">
          <div className="flex items-center">
            <span
              className={`text-base md:text-lg font-bold mr-1 ${(() => {
                const nota = parseFloat(detalhesAlbum?.mediaAvaliacao ?? 0);
                if (progressoAvaliacao.percentual < 100) {
                  return "text-gray-400";
                }
                if (nota < 4) return "text-red-500";
                if (nota < 7) return "text-yellow-500";
                return "text-verde-destaque";
              })()}`}
            >
              {detalhesAlbum?.mediaAvaliacao ?? 0}
            </span>
            <span className="text-xs text-gray-400">/10</span>
          </div>
          {/* Botão Spotify */}
          {((info.external_urls && info.external_urls.spotify) || info.id) && (
            <a
              href={
                info.external_urls && info.external_urls.spotify
                  ? info.external_urls.spotify
                  : `https://open.spotify.com/album/${info.id}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-[11px] px-1.5 py-0.5 bg-black/20 rounded gap-1 text-gray-300 hover:text-green-400 hover:bg-black/40 transition-colors"
              style={{ width: "fit-content" }}
              onClick={(e) => e.stopPropagation()}
            >
              <svg
                className="mr-1 text-green-400"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.48.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              Spotify
            </a>
          )}
        </div>

        {/* Barra de progresso de avaliação */}
        {!erro && !album.erro && (
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400 text-[10px]">
                {t("albumCard.rated")}:
              </span>
              <span className="text-gray-400 text-[10px]">
                {progressoAvaliacao.avaliadas}/{progressoAvaliacao.total} (
                {percentualFormatado}%)
              </span>
            </div>
            <div className="w-full h-1.5 bg-cinza rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ease-in-out ${
                  percentualFormatado >= 100
                    ? "bg-verde-destaque"
                    : "bg-blue-500/50"
                }`}
                style={{
                  width: `${percentualFormatado}%`,
                }}
              ></div>
            </div>
          </div>
        )}

        <button
          className="mt-3 w-full bg-verde-destaque text-cinza-escuro py-1.5 px-3 rounded-lg hover:bg-verde-pastel transition-colors text-xs md:text-sm cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setAlbumSelecionado(album.id);
          }}
        >
          {t("albumCard.viewTracks")}
        </button>
      </div>
    </div>
  );
};

export default CardAlbumAvaliado;
