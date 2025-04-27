import { useState, useEffect } from "react";
import { buscarAlbum } from "../../services/spotify";
import DetalhesAlbum from "./DetalhesAlbum";

/**
 * Componente para exibir os álbuns encontrados na pesquisa
 * @param {Object} props - Propriedades do componente
 * @param {string} props.termoPesquisa - Termo de pesquisa do álbum
 */
const MostrarTopAlbuns = ({ termoPesquisa }) => {
  const [albuns, setAlbuns] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [albumSelecionado, setAlbumSelecionado] = useState(null);

  // Buscar álbuns quando o termo de pesquisa mudar
  useEffect(() => {
    const buscarDadosAlbum = async () => {
      if (termoPesquisa && termoPesquisa.trim() !== "") {
        try {
          setCarregando(true);
          const dadosAlbum = await buscarAlbum(termoPesquisa);
          setAlbuns(dadosAlbum);
          setAlbumSelecionado(null); // Resetar álbum selecionado quando buscar novo álbum
        } catch (erro) {
          console.error("Erro ao buscar álbum:", erro);
        } finally {
          setCarregando(false);
        }
      }
    };

    buscarDadosAlbum();
  }, [termoPesquisa]);

  // Quando um álbum é selecionado, mostra seus detalhes
  if (albumSelecionado) {
    return (
      <DetalhesAlbum
        albumId={albumSelecionado}
        onVoltar={() => setAlbumSelecionado(null)}
      />
    );
  }

  return (
    <div className="p-6 overflow-hidden">
      <h1 className="text-3xl font-bold mb-8 text-verde-destaque">
        Pesquisar por Álbum
      </h1>

      {carregando ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-verde-destaque"></div>
        </div>
      ) : albuns && albuns.items && albuns.items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {albuns.items.slice(0, 10).map((album) => (
            <div
              key={album.id}
              className="flex flex-col bg-cinza-escuro rounded-xl p-4 hover:bg-cinza transition-all duration-300 transform hover:scale-105 cursor-pointer"
              onClick={() => setAlbumSelecionado(album.id)}
            >
              {album.images && album.images.length > 0 && (
                <img
                  src={album.images[0].url}
                  alt={`Capa do álbum ${album.name}`}
                  className="w-full h-auto rounded-lg shadow-lg mb-4"
                />
              )}
              <h2 className="font-bold text-lg mb-2 line-clamp-2">
                {album.name}
              </h2>
              <p className="text-verde-destaque mb-1">
                {album.artists[0].name}
              </p>
              <p className="text-sm text-gray-400">
                Lançamento: {new Date(album.release_date).getFullYear()}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setAlbumSelecionado(album.id);
                }}
                className="cursor-pointer bg-verde-destaque text-cinza-escuro py-2 px-4 rounded-lg hover:bg-verde-pastel transition-colors mt-auto"
              >
                Ver faixas
              </button>
            </div>
          ))}
        </div>
      ) : termoPesquisa ? (
        <p className="text-center text-gray-400 text-lg">
          Nenhum álbum encontrado
        </p>
      ) : (
        <p className="text-center text-gray-400 text-lg">
          Digite um nome de álbum na barra de pesquisa
        </p>
      )}
    </div>
  );
};

export default MostrarTopAlbuns;
