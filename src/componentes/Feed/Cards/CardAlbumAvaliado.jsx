import { MdReportProblem } from "react-icons/md";

/**
 * Componente que exibe um cartão de álbum avaliado
 *
 * @param {Object} props - Propriedades do componente
 * @param {Object} props.album - Dados do álbum a ser exibido
 * @param {Function} props.setAlbumSelecionado - Função para definir um álbum como selecionado
 * @returns {JSX.Element} Componente de cartão de álbum
 */
const CardAlbumAvaliado = ({ album, setAlbumSelecionado }) => {
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
          alt={`Capa do álbum ${album.name}`}
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
        {album.artists?.map((a) => a.name).join(", ") || "Artista desconhecido"}
      </p>

      {/* Informações de avaliação */}
      <div className="mt-auto">
        {/* Nota média */}
        <div className="flex items-center mt-2 mb-1">
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

        {/* Barra de progresso de avaliação */}
        {!album.erro && (
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400 text-[10px]">Avaliado:</span>
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
          Ver faixas
        </button>
      </div>
    </div>
  );
};

export default CardAlbumAvaliado;
