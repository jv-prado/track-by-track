import { useState, useEffect } from "react";
import { buscarAlbum } from "../../services/spotify";
import DetalhesAlbum from "./DetalhesAlbum";
import { MdMusicNote } from "react-icons/md";
import { useTranslation } from "react-i18next";

/**
 * Componente para exibir os álbuns encontrados na pesquisa
 * @param {Object} props - Propriedades do componente
 * @param {string} props.termoPesquisa - Termo de pesquisa do álbum
 */
const MostrarTopAlbuns = ({ termoPesquisa }) => {
  const [albuns, setAlbuns] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [albumSelecionado, setAlbumSelecionado] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const { t } = useTranslation();

  // Atualizar largura da janela quando ela for redimensionada
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

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
          // Erro silencioso
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

  // Determinar o número de colunas com base na largura da tela
  const getGridColsClass = () => {
    if (windowWidth < 550) return "grid-cols-2"; // 2 álbuns por linha em telas menores que 550px
    if (windowWidth < 1100) return "grid-cols-2"; // 2 álbuns por linha em telas menores que 1100px
    if (windowWidth < 1280) return "grid-cols-3"; // lg
    if (windowWidth < 1536) return "grid-cols-4"; // xl
    return "grid-cols-5"; // 2xl
  };

  return (
    <div className="p-6">
      <h1 className="md:text-3xl text-2xl text-center md:text-left font-bold mb-8 text-verde-destaque">
        {t("albumSearch.title", "Pesquisar por Álbum")}
      </h1>

      {carregando ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-verde-destaque"></div>
        </div>
      ) : albuns && albuns.items && albuns.items.length > 0 ? (
        <div className={`grid ${getGridColsClass()} gap-4 md:gap-6 lg:gap-8`}>
          {albuns.items.slice(0, 10).map((album) => (
            <div
              key={album.id}
              className="flex flex-col bg-cinza-escuro rounded-xl p-4 hover:bg-cinza transition-all duration-300 transform hover:scale-105 cursor-pointer"
              onClick={() => setAlbumSelecionado(album.id)}
            >
              <div className="w-full aspect-square mb-4 overflow-hidden rounded-lg shadow-lg">
                {album.images && album.images.length > 0 ? (
                  <img
                    src={album.images[0].url}
                    alt={t(
                      "albumSearch.coverAlt",
                      "Capa do álbum {{albumName}}",
                      { albumName: album.name }
                    )}
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
              <h2 className="font-bold text-lg mb-2 line-clamp-2">
                {album.name}
              </h2>
              <p className="text-verde-destaque mb-1 text-sm md:text-base line-clamp-1">
                {album.artists[0].name}
              </p>
              <p className="text-sm text-gray-400">
                {t("albumSearch.releaseYear", "Lançamento: {{year}}", {
                  year: new Date(album.release_date).getFullYear(),
                })}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setAlbumSelecionado(album.id);
                }}
                className="mt-4 cursor-pointer bg-verde-destaque text-cinza-escuro py-2 px-4 rounded-lg hover:bg-verde-pastel transition-colors mt-auto"
              >
                {t("albumSearch.viewTracks", "Ver faixas")}
              </button>
            </div>
          ))}
        </div>
      ) : termoPesquisa ? (
        <p className="text-center text-gray-400 text-lg">
          {t("albumSearch.noAlbumsFound", "Nenhum álbum encontrado")}
        </p>
      ) : (
        <p className="text-center md:text-left  text-gray-400 md:text-lg text-sm">
          {t(
            "albumSearch.typeToSearch",
            "Digite um nome de álbum na barra de pesquisa"
          )}
        </p>
      )}
    </div>
  );
};

export default MostrarTopAlbuns;
