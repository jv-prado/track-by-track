import { useState, useEffect } from "react";
import { buscarArtista } from "../../services/spotify";
import ListaAlbuns from "./ListaAlbuns";
import { useTranslation } from "react-i18next";
import { MdReportProblem } from "react-icons/md";

/**
 * Componente para exibir os artistas encontrados na pesquisa
 * @param {Object} props - Propriedades do componente
 * @param {string} props.termoPesquisa - Termo de pesquisa do artista
 */
const MostrarTopArtistas = ({ termoPesquisa }) => {
  const [artistas, setArtistas] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [artistaSelecionado, setArtistaSelecionado] = useState(null);
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

  // Buscar artistas quando o termo de pesquisa mudar
  useEffect(() => {
    const buscarDadosArtista = async () => {
      if (termoPesquisa && termoPesquisa.trim() !== "") {
        try {
          setCarregando(true);
          const dadosArtista = await buscarArtista(termoPesquisa);
          setArtistas(dadosArtista);
          setArtistaSelecionado(null); // Resetar artista selecionado quando buscar novo artista
        } catch (erro) {
          console.error("Erro ao buscar artista:", erro);
        } finally {
          setCarregando(false);
        }
      } else {
        // Se o termo de pesquisa estiver vazio, limpar os resultados
        setArtistas(null);
      }
    };

    buscarDadosArtista();
  }, [termoPesquisa]);

  // Quando um artista é selecionado, mostra seus álbuns
  if (artistaSelecionado) {
    return (
      <ListaAlbuns
        artistaId={artistaSelecionado}
        onVoltar={() => setArtistaSelecionado(null)}
      />
    );
  }

  // Determinar o número de colunas com base na largura da tela
  const getGridCols = () => {
    if (windowWidth < 550) return 2; // 2 artistas por linha em telas menores que 550px
    if (windowWidth < 1100) return 2; // 2 artistas por linha em telas menores que 1100px
    if (windowWidth < 1500) return 3; // 3 artistas por linha em telas médias
    return 5; // 5 artistas por linha em telas grandes
  };

  const gridCols = getGridCols();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-verde-destaque mb-4 md:text-left text-center">
        {t("artistSearch.title", "Pesquisar por Artista")}
      </h1>

      {carregando ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-verde-destaque"></div>
        </div>
      ) : artistas && artistas.items && artistas.items.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${gridCols}, minmax(160px, 200px))`,
            justifyContent: "center",
            gap: "1.2rem",
          }}
        >
          {artistas.items.slice(0, 10).map((artista) => (
            <div
              key={artista.id}
              className="flex flex-col items-center bg-cinza-escuro/80 rounded-2xl p-2 md:p- hover:bg-cinza-escuro/95 transition-all duration-200 transform hover:scale-[1.03] cursor-pointer shadow-md border border-cinza-escuro/30"
              onClick={() => setArtistaSelecionado(artista.id)}
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
              {/* Imagem do artista */}
              {artista.images && artista.images.length > 0 ? (
                <img
                  src={artista.images[0].url}
                  alt={t("artistSearch.photoAlt", "Foto de {{artistName}}", {
                    artistName: artista.name,
                  })}
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
                {/* Título do artista centralizado verticalmente no espaço reservado */}
                <div
                  className="flex items-center justify-center w-full mb-1"
                  style={{
                    minHeight: "48px",
                    maxHeight: "48px",
                  }}
                >
                  <h3
                    className="font-semibold text-[0.97rem] md:text-base w-full text-gray-100 text-center"
                    title={artista.name}
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
                    {artista.name}
                  </h3>
                </div>

                {/* Seguidores */}
                <p className="text-xs text-gray-400 mb-2 text-center w-full mt-2.5">
                  {t("artistSearch.followers", "Seguidores: {{count}}", {
                    count: artista.followers?.total.toLocaleString(),
                  })}
                </p>

                {/* Espaço flexível para distribuir o conteúdo */}
                <div className="flex-1" />

                {/* Botão sempre na parte inferior */}
                <button
                  className="mt-0 w-full bg-verde-destaque/90 text-cinza-escuro py-1 px-2 rounded-lg hover:bg-verde-pastel transition-colors text-xs md:text-sm cursor-pointer font-semibold shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setArtistaSelecionado(artista.id);
                  }}
                  style={{
                    minHeight: "32px",
                  }}
                >
                  {t("artistSearch.viewAlbums", "Ver álbuns")}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : termoPesquisa ? (
        <p className="text-center text-gray-400 text-lg">
          {t("artistSearch.noArtistsFound", "Nenhum artista encontrado")}
        </p>
      ) : (
        <p className="text-center md:text-left text-gray-400 md:text-lg text-sm">
          {t(
            "artistSearch.typeToSearch",
            "Digite um nome de artista na barra de pesquisa"
          )}
        </p>
      )}
    </div>
  );
};

export default MostrarTopArtistas;
