import { MdReportProblem } from "react-icons/md";
import { useTranslation } from "react-i18next";

/**
 * Componente que exibe um cartão de álbum avaliado
 *
 * @param {Object} props - Propriedades do componente
 * @param {Object} props.album - Dados do álbum a ser exibido
 * @param {Function} props.setAlbumSelecionado - Função para definir um álbum como selecionado
 * @returns {JSX.Element} Componente de cartão de álbum
 */
const CardAlbumAvaliado = ({ album, setAlbumSelecionado }) => {
  const { t } = useTranslation();

  // Verificação defensiva para garantir que progressoAvaliacao exista
  const progressoAvaliacao = album.progressoAvaliacao || {
    avaliadas: 0,
    total: 0,
    percentual: 0,
  };

  // Formatar a média: número inteiro para notas inteiras, uma casa decimal para fracionárias
  const mediaFormatada = album.mediaAvaliacao
    ? Number.isInteger(album.mediaAvaliacao)
      ? album.mediaAvaliacao.toString()
      : album.mediaAvaliacao.toFixed(1)
    : "0";

  // Formatar o percentual como número inteiro
  const percentualFormatado = Math.floor(progressoAvaliacao.percentual);

  return (
    <div
      key={album.id}
      className={`flex flex-col bg-cinza-escuro rounded-xl p-3 hover:bg-cinza transition-all duration-300 transform hover:scale-105 cursor-pointer ${
        album.erro ? "border border-red-500" : ""
      }`}
      onClick={() => setAlbumSelecionado(album.id)}
    >
      {/* Imagem do álbum */}
      {album.images && album.images.length > 0 ? (
        <img
          src={album.images[0].url}
          alt={t("albumCard.coverAlt", { albumName: album.name })}
          className="w-full h-auto aspect-square object-cover rounded-lg shadow-lg mb-3"
        />
      ) : (
        <div className="w-full aspect-square bg-cinza flex items-center justify-center rounded-lg shadow-lg mb-3">
          <MdReportProblem className="text-red-500 text-3xl md:text-4xl" />
        </div>
      )}

      {/* Informações do álbum */}
      <h3 className="font-bold text-sm md:text-base mb-1 line-clamp-2">
        {album.name}
      </h3>
      <p className="text-verde-destaque text-xs md:text-sm mb-1 line-clamp-1">
        {album.artists?.map((a) => a.name).join(", ") ||
          t("albumCard.unknownArtist")}
      </p>

      {/* Informações de avaliação */}
      <div className="mt-auto">
        {/* Nota média e botão Spotify alinhados */}
        <div className="flex items-center justify-between mt-2 mb-1">
          <div className="flex items-center">
            <span
              className={`text-base md:text-lg font-bold mr-1 ${(() => {
                // Verificar primeiro se o álbum está totalmente avaliado
                if (progressoAvaliacao.percentual < 100) {
                  return "text-gray-400"; // Cor cinza enquanto não estiver 100% avaliado
                }

                // Converter para número para garantir a comparação correta
                const nota = parseFloat(album.mediaAvaliacao || 0);
                if (nota < 4) return "text-red-500"; // Nota baixa: vermelho
                if (nota < 7) return "text-yellow-500"; // Nota média: amarelo
                return "text-verde-destaque"; // Nota alta: verde
              })()}`}
            >
              {mediaFormatada}
            </span>
            <span className="text-xs text-gray-400">/10</span>
          </div>
          {/* Botão Spotify */}
          {((album.external_urls && album.external_urls.spotify) ||
            album.id) && (
            <a
              href={
                album.external_urls && album.external_urls.spotify
                  ? album.external_urls.spotify
                  : `https://open.spotify.com/album/${album.id}`
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
        {!album.erro && (
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
