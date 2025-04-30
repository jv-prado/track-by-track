import { useState, useEffect } from "react";
import { buscarArtista } from "../../services/spotify";
import ListaAlbuns from "./ListaAlbuns";
import { useTranslation } from "react-i18next";

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
  const getGridColsClass = () => {
    if (windowWidth < 550) return "grid-cols-2"; // 2 artistas por linha em telas menores que 550px
    if (windowWidth < 1100) return "grid-cols-2"; // 2 artistas por linha em telas menores que 1100px
    if (windowWidth < 1280) return "grid-cols-3"; // lg
    if (windowWidth < 1536) return "grid-cols-4"; // xl
    return "grid-cols-5"; // 2xl
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl text-center md:text-left font-bold mb-8 text-verde-destaque">
        {t("artistSearch.title", "Pesquisar por Artista")}
      </h1>

      {carregando ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-verde-destaque"></div>
        </div>
      ) : artistas && artistas.items && artistas.items.length > 0 ? (
        <div className={`grid ${getGridColsClass()} gap-4 md:gap-6 lg:gap-8`}>
          {artistas.items.slice(0, 10).map((artista) => (
            <div
              key={artista.id}
              className="flex flex-col bg-cinza-escuro rounded-xl p-4 hover:bg-cinza transition-all duration-300 transform hover:scale-105 cursor-pointer"
              onClick={() => setArtistaSelecionado(artista.id)}
            >
              {artista.images && artista.images.length > 0 && (
                <div className="w-full aspect-square mb-4">
                  <img
                    src={artista.images[0].url}
                    alt={t("artistSearch.photoAlt", "Foto de {{artistName}}", {
                      artistName: artista.name,
                    })}
                    className="w-full h-full object-cover rounded-lg shadow-lg"
                  />
                </div>
              )}
              <h2 className="font-bold text-lg mb-2 line-clamp-2">
                {artista.name}
              </h2>

              <p className="text-sm text-gray-400">
                {t("artistSearch.followers", "Seguidores: {{count}}", {
                  count: artista.followers?.total.toLocaleString(),
                })}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setArtistaSelecionado(artista.id);
                }}
                className="mt-4 cursor-pointer bg-verde-destaque text-cinza-escuro py-2 px-4 rounded-lg hover:bg-verde-pastel transition-colors mt-auto"
              >
                {t("artistSearch.viewAlbums", "Ver álbuns")}
              </button>
            </div>
          ))}
        </div>
      ) : termoPesquisa ? (
        <p className="text-center text-gray-400 text-lg">
          {t("artistSearch.noArtistsFound", "Nenhum artista encontrado")}
        </p>
      ) : (
        <p className="text-center md:text-left text-gray-400 text-lg">
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
