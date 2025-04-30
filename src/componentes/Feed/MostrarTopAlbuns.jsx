import { useState, useEffect } from "react";
import { buscarAlbum } from "../../services/spotify";
import DetalhesAlbum from "./DetalhesAlbum";
import { MdMusicNote, MdReportProblem } from "react-icons/md";
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

  // Determinar o número de colunas com base na largura da tela (similar a MinhasAvaliacoes.jsx)
  const getGridCols = () => {
    if (windowWidth < 550) return 2; // 2 álbuns por linha em telas menores que 550px
    if (windowWidth < 1100) return 2; // 2 álbuns por linha em telas menores que 1100px
    if (windowWidth < 1500) return 3; // 3 álbuns por linha em telas médias
    return 5; // 5 álbuns por linha em telas grandes
  };

  const gridCols = getGridCols();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-verde-destaque mb-4 md:text-left text-center">
        {t("albumSearch.title", "Pesquisar por Álbum")}
      </h1>

      {carregando ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-verde-destaque"></div>
        </div>
      ) : albuns && albuns.items && albuns.items.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${gridCols}, minmax(160px, 200px))`,
            justifyContent: "center",
            gap: "1.2rem",
          }}
        >
          {albuns.items.slice(0, 10).map((album) => (
            <div
              key={album.id}
              className="flex flex-col items-center bg-cinza-escuro/80 rounded-2xl p-2 md:p- hover:bg-cinza-escuro/95 transition-all duration-200 transform hover:scale-[1.03] cursor-pointer shadow-md border border-cinza-escuro/30"
              onClick={() => setAlbumSelecionado(album.id)}
              style={{
                minWidth: "160px",
                maxWidth: "200px",
                minHeight: "320px",
                height: "340px",
                boxShadow: "0 2px 8px 0 rgba(0,0,0,0.08)",
                transition: "box-shadow 0.2s",
                margin: "0 auto",
                display: "flex",
              }}
            >
              {/* Imagem do álbum */}
              {album.images && album.images.length > 0 ? (
                <img
                  src={album.images[0].url}
                  alt={t("albumCard.coverAlt", { albumName: album.name })}
                  className="w-full aspect-square object-cover rounded-xl shadow mb-2"
                  loading="lazy"
                  style={{
                    minHeight: 0,
                    maxHeight: "160px",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div className="w-full aspect-square bg-cinza flex items-center justify-center rounded-xl shadow mb-2">
                  <MdReportProblem className="text-red-500 text-3xl md:text-4xl" />
                </div>
              )}

              {/* Conteúdo interno do card centralizado */}
              <div className="flex flex-col flex-1 items-center w-full">
                {/* Título do álbum centralizado verticalmente no espaço reservado */}
                <div
                  className="flex items-center justify-center w-full mb-1"
                  style={{
                    minHeight: "48px",
                    maxHeight: "48px",
                  }}
                >
                  <h3
                    className="font-semibold text-[0.97rem] md:text-base w-full text-gray-100 text-center"
                    title={album.name}
                    style={{
                      maxWidth: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                    }}
                  >
                    {album.name}
                  </h3>
                </div>

                {/* Artista */}
                <p className="text-verde-destaque text-xs md:text-sm mb-0.5 line-clamp-1 font-medium text-center w-full mt-2.5">
                  {album.artists[0].name}
                </p>

                {/* Ano de lançamento */}
                <p className="text-xs text-gray-400 mb-2 text-center w-full">
                  {t("albumSearch.releaseYear", "Lançamento: {{year}}", {
                    year: new Date(album.release_date).getFullYear(),
                  })}
                </p>

                {/* Espaço flexível para distribuir o conteúdo */}
                <div className="flex-1" />

                {/* Botão sempre na parte inferior */}
                <button
                  className="mt-0 w-full bg-verde-destaque/90 text-cinza-escuro py-1 px-2 rounded-lg hover:bg-verde-pastel transition-colors text-xs md:text-sm cursor-pointer font-semibold shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAlbumSelecionado(album.id);
                  }}
                  style={{
                    minHeight: "32px",
                  }}
                >
                  {t("albumSearch.viewTracks", "Ver faixas")}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : termoPesquisa ? (
        <p className="text-center text-gray-400 text-lg">
          {t("albumSearch.noAlbumsFound", "Nenhum álbum encontrado")}
        </p>
      ) : (
        <p className="text-center md:text-left text-gray-400 md:text-lg text-sm">
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
