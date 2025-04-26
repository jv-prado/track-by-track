import { useState, useEffect } from "react";
import { buscarArtista } from "../../services/spotify";
import ListaAlbuns from "./ListaAlbuns";

/**
 * Componente para exibir os artistas encontrados na pesquisa
 * @param {Object} props - Propriedades do componente
 * @param {string} props.termoPesquisa - Termo de pesquisa do artista
 */
const MostrarTopArtistas = ({ termoPesquisa }) => {
  const [artistas, setArtistas] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [artistaSelecionado, setArtistaSelecionado] = useState(null);

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

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8 text-verde-destaque">
        Pesquisar por Artista
      </h1>

      {carregando ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-verde-destaque"></div>
        </div>
      ) : artistas && artistas.items && artistas.items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
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
                    alt={`Foto de ${artista.name}`}
                    className="w-full h-full object-cover rounded-lg shadow-lg"
                  />
                </div>
              )}
              <h2 className="font-bold text-lg mb-2 line-clamp-2">
                {artista.name}
              </h2>
              <p className="text-verde-destaque mb-1">
                Popularidade: {artista.popularity}
              </p>
              <p className="text-sm text-gray-400">
                Seguidores: {artista.followers?.total.toLocaleString()}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setArtistaSelecionado(artista.id);
                  console.log("Artista selecionado:", artista.id);
                }}
                className="mt-4 cursor-pointer bg-verde-destaque text-cinza-escuro py-2 px-4 rounded-lg hover:bg-verde-pastel transition-colors mt-auto"
              >
                Ver álbuns
              </button>
            </div>
          ))}
        </div>
      ) : termoPesquisa ? (
        <p className="text-center text-gray-400 text-lg">
          Nenhum artista encontrado
        </p>
      ) : (
        <p className="text-center text-gray-400 text-lg">
          Digite um nome de artista na barra de pesquisa
        </p>
      )}
    </div>
  );
};

export default MostrarTopArtistas;
