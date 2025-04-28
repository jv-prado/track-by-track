import { useState, useEffect } from "react";
import { buscarAlbum } from "../../services/spotify";
import DetalhesAlbum from "./DetalhesAlbum";
import { MdMusicNote } from "react-icons/md";

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

  // Função para lidar com erro de carregamento de imagem
  const handleImageError = (e) => {
    e.target.style.display = "none";
    e.target.parentElement.classList.add(
      "flex",
      "items-center",
      "justify-center",
      "bg-cinza-escuro"
    );
    const fallbackIcon = document.createElement("div");
    fallbackIcon.className = "text-verde-destaque text-4xl";
    fallbackIcon.innerHTML = "<MdMusicNote />";
    e.target.parentElement.appendChild(fallbackIcon);
  };

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
    <div className="p-4 md:p-6 overflow-hidden">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-8 text-verde-destaque">
        Pesquisar por Álbum
      </h1>

      {carregando ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-verde-destaque"></div>
        </div>
      ) : albuns && albuns.items && albuns.items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 lg:gap-6">
          {albuns.items.slice(0, 10).map((album) => (
            <div
              key={album.id}
              className="flex flex-col bg-cinza-escuro rounded-xl p-3 md:p-4 hover:bg-cinza transition-all duration-300 transform hover:scale-[1.03] cursor-pointer shadow-md hover:shadow-lg h-full"
              onClick={() => setAlbumSelecionado(album.id)}
            >
              <div className="w-full aspect-square mb-3 overflow-hidden rounded-lg shadow-lg">
                {album.images && album.images.length > 0 ? (
                  <img
                    src={album.images[0].url}
                    alt={`Capa do álbum ${album.name}`}
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-cinza-escuro">
                    <MdMusicNote className="text-verde-destaque text-4xl" />
                  </div>
                )}
              </div>
              <h2 className="font-bold text-base md:text-lg mb-1 line-clamp-2 min-h-[2.5rem]">
                {album.name}
              </h2>
              <p className="text-verde-destaque mb-1 text-sm md:text-base line-clamp-1">
                {album.artists[0].name}
              </p>
              <p className="text-xs md:text-sm text-gray-400 mb-3">
                Lançamento: {new Date(album.release_date).getFullYear()}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setAlbumSelecionado(album.id);
                }}
                className="cursor-pointer bg-verde-destaque text-cinza-escuro py-1.5 md:py-2 px-3 md:px-4 rounded-lg hover:bg-verde-pastel transition-colors mt-auto text-sm md:text-base font-medium"
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
