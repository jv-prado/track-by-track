import { useState, useEffect } from "react";
import { buscarArtista, buscarAlbunsPorArtista } from "../../services/spotify";
import { getSpotifyToken } from "../../services/api";
import { FaStar, FaRegStar } from "react-icons/fa";

export default function MostrarTopArtistas({ termoPesquisa }) {
  const [artista, setArtista] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [artistaSelecionado, setArtistaSelecionado] = useState(null);
  const [albunsDoArtista, setAlbunsDoArtista] = useState(null);
  const [carregandoAlbuns, setCarregandoAlbuns] = useState(false);
  const [albumSelecionado, setAlbumSelecionado] = useState(null);
  const [faixasDoAlbum, setFaixasDoAlbum] = useState(null);
  const [carregandoFaixas, setCarregandoFaixas] = useState(false);
  const [avaliacoes, setAvaliacoes] = useState({});
  const [detalhesAlbum, setDetalhesAlbum] = useState(null);

  // Carregar avaliações do localStorage quando o componente montar
  useEffect(() => {
    const avaliacoesSalvas = localStorage.getItem("avaliacoesFaixas");
    if (avaliacoesSalvas) {
      setAvaliacoes(JSON.parse(avaliacoesSalvas));
    }
  }, []);

  useEffect(() => {
    const buscarDadosArtista = async () => {
      if (termoPesquisa && termoPesquisa.trim() !== "") {
        try {
          setCarregando(true);
          const dadosArtista = await buscarArtista(termoPesquisa);
          setArtista(dadosArtista);
          setArtistaSelecionado(null); // Resetar artista selecionado quando buscar novo artista
          setAlbunsDoArtista(null);
          setAlbumSelecionado(null);
          setFaixasDoAlbum(null);
          setDetalhesAlbum(null);
        } catch (erro) {
          console.error("Erro ao buscar artista:", erro);
        } finally {
          setCarregando(false);
        }
      }
    };

    buscarDadosArtista();
  }, [termoPesquisa]);

  useEffect(() => {
    const buscarAlbuns = async () => {
      if (artistaSelecionado) {
        try {
          setCarregandoAlbuns(true);
          const dados = await buscarAlbunsPorArtista(artistaSelecionado);
          setAlbunsDoArtista(dados);
          setAlbumSelecionado(null);
          setFaixasDoAlbum(null);
          setDetalhesAlbum(null);
        } catch (erro) {
          console.error("Erro ao buscar álbuns do artista:", erro);
        } finally {
          setCarregandoAlbuns(false);
        }
      }
    };

    buscarAlbuns();
  }, [artistaSelecionado]);

  useEffect(() => {
    const buscarFaixas = async () => {
      if (albumSelecionado) {
        try {
          setCarregandoFaixas(true);
          // Buscar faixas diretamente da API do Spotify
          const token = await getSpotifyToken();

          // Buscar detalhes do álbum
          const albumResponse = await fetch(
            `https://api.spotify.com/v1/albums/${albumSelecionado}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          const albumDados = await albumResponse.json();
          setDetalhesAlbum(albumDados);

          // Buscar faixas
          const response = await fetch(
            `https://api.spotify.com/v1/albums/${albumSelecionado}/tracks`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          const dados = await response.json();
          setFaixasDoAlbum(dados);

          // Inicializar avaliações para novas faixas
          const novasAvaliacoes = { ...avaliacoes };
          dados.items.forEach((faixa) => {
            if (!novasAvaliacoes[faixa.id]) {
              novasAvaliacoes[faixa.id] = 0;
            }
          });
          setAvaliacoes(novasAvaliacoes);

          setCarregandoFaixas(false);
        } catch (erro) {
          console.error("Erro ao buscar faixas do álbum:", erro);
          setCarregandoFaixas(false);
        }
      }
    };

    buscarFaixas();
  }, [albumSelecionado]);

  const formatarDuracao = (ms) => {
    const minutos = Math.floor(ms / 60000);
    const segundos = Math.floor((ms % 60000) / 1000);
    return `${minutos}:${segundos < 10 ? "0" : ""}${segundos}`;
  };

  const calcularDuracaoTotal = () => {
    if (
      !faixasDoAlbum ||
      !faixasDoAlbum.items ||
      faixasDoAlbum.items.length === 0
    ) {
      return "0:00";
    }

    const totalMs = faixasDoAlbum.items.reduce((total, faixa) => {
      return total + faixa.duration_ms;
    }, 0);

    const minutos = Math.floor(totalMs / 60000);
    const segundos = Math.floor((totalMs % 60000) / 1000);

    return `${minutos}:${segundos < 10 ? "0" : ""}${segundos}`;
  };

  const avaliarFaixa = (faixaId, estrelas) => {
    const novasAvaliacoes = {
      ...avaliacoes,
      [faixaId]: estrelas,
    };

    setAvaliacoes(novasAvaliacoes);

    // Salvar avaliações no localStorage
    localStorage.setItem("avaliacoesFaixas", JSON.stringify(novasAvaliacoes));
  };

  const calcularMediaAvaliacoes = () => {
    if (
      !faixasDoAlbum ||
      !faixasDoAlbum.items ||
      faixasDoAlbum.items.length === 0
    ) {
      return 0;
    }

    const soma = faixasDoAlbum.items.reduce((total, faixa) => {
      return total + (avaliacoes[faixa.id] || 0);
    }, 0);

    // Convertendo para escala de 0 a 10
    const mediaEm5 = soma / faixasDoAlbum.items.length;
    const mediaEm10 = (mediaEm5 * 2).toFixed(1);

    return mediaEm10;
  };

  const renderEstrelas = (faixaId) => {
    const avaliacao = avaliacoes[faixaId] || 0;
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((estrela) => (
          <span
            key={estrela}
            onClick={() => avaliarFaixa(faixaId, estrela)}
            className="cursor-pointer"
          >
            {estrela <= avaliacao ? (
              <FaStar className="text-yellow-400" />
            ) : (
              <FaRegStar className="text-yellow-400" />
            )}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6">
      {!artistaSelecionado && (
        <h1 className="text-3xl font-bold mb-8 text-verde-destaque">
          Pesquisar por Artista
        </h1>
      )}

      {carregando ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-verde-destaque"></div>
        </div>
      ) : artistaSelecionado ? (
        <div>
          {!albumSelecionado && (
            <button
              onClick={() => {
                setArtistaSelecionado(null);
                setAlbumSelecionado(null);
                setFaixasDoAlbum(null);
                setDetalhesAlbum(null);
              }}
              className="mb-4 bg-cinza py-2 px-4 rounded-lg hover:bg-cinza-escuro transition-colors"
            >
              Voltar para artistas
            </button>
          )}

          {albumSelecionado && faixasDoAlbum ? (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-verde-destaque">
                Faixas do Álbum
              </h2>

              {carregandoFaixas ? (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-verde-destaque"></div>
                </div>
              ) : (
                <div className="bg-cinza-escuro rounded-xl p-6">
                  {detalhesAlbum && (
                    <div className="flex mb-6 gap-6">
                      <div className="w-48 h-48 flex-shrink-0">
                        {detalhesAlbum.images &&
                          detalhesAlbum.images.length > 0 && (
                            <img
                              src={detalhesAlbum.images[0].url}
                              alt={`Capa do álbum ${detalhesAlbum.name}`}
                              className="w-full h-full object-cover rounded-lg shadow-lg"
                            />
                          )}
                      </div>
                      <div className="flex flex-col justify-between">
                        <div>
                          <h3 className="text-2xl font-bold mb-2">
                            {detalhesAlbum.name}
                          </h3>
                          <p className="text-verde-destaque mb-1">
                            {detalhesAlbum.artists
                              .map((a) => a.name)
                              .join(", ")}
                          </p>
                          <p className="text-sm text-gray-400 mb-1">
                            Lançamento:{" "}
                            {new Date(detalhesAlbum.release_date).getFullYear()}
                          </p>
                          <p className="text-sm text-gray-400 mb-1">
                            Total de faixas: {detalhesAlbum.total_tracks}
                          </p>
                          <p className="text-sm text-gray-400 mb-1">
                            Duração total: {calcularDuracaoTotal()}
                          </p>
                          {detalhesAlbum.genres &&
                          detalhesAlbum.genres.length > 0 ? (
                            <p className="text-sm text-gray-400">
                              Gêneros: {detalhesAlbum.genres.join(", ")}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-400">
                              Gêneros: Não informado
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-xl font-semibold">Avaliação média:</h3>
                    <div className="flex items-center">
                      <span className="text-2xl font-bold text-yellow-400 mr-2">
                        {calcularMediaAvaliacoes()}
                      </span>
                      <span className="text-yellow-400">/10</span>
                    </div>
                  </div>
                  <ul className="divide-y divide-gray-700">
                    {faixasDoAlbum.items.map((faixa, index) => (
                      <li
                        key={faixa.id}
                        className="py-3 flex justify-between items-center hover:bg-cinza px-4 rounded-lg"
                      >
                        <div className="flex items-center">
                          <span className="text-gray-400 mr-4">
                            {index + 1}
                          </span>
                          <span>{faixa.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-gray-400">
                            {formatarDuracao(faixa.duration_ms)}
                          </span>
                          {renderEstrelas(faixa.id)}
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6">
                    <button
                      onClick={() => {
                        setAlbumSelecionado(null);
                        setFaixasDoAlbum(null);
                        setDetalhesAlbum(null);
                      }}
                      className="bg-cinza py-2 px-4 rounded-lg hover:bg-cinza-escuro transition-colors"
                    >
                      Voltar para álbuns
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : carregandoAlbuns ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-verde-destaque"></div>
            </div>
          ) : albunsDoArtista ? (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-verde-destaque">
                Álbuns de{" "}
                {albunsDoArtista.items[0]?.artists[0]?.name || "Artista"}
              </h2>
              <div className="grid grid-cols-5 gap-8">
                {albunsDoArtista.items.map((album) => (
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
                    <h3 className="font-bold text-lg mb-2 line-clamp-2">
                      {album.name}
                    </h3>
                    <p className="text-verde-destaque mb-1">
                      {album.artists.map((a) => a.name).join(", ")}
                    </p>
                    <p className="text-sm text-gray-400">
                      Lançamento: {new Date(album.release_date).getFullYear()}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Faixas: {album.total_tracks}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-400 text-lg">
              Nenhum álbum encontrado para este artista
            </p>
          )}
        </div>
      ) : artista ? (
        <div className="grid grid-cols-5 gap-8">
          {artista.items.slice(0, 10).map((artista) => (
            <div
              key={artista.id}
              className="flex flex-col bg-cinza-escuro rounded-xl p-4 hover:bg-cinza transition-all duration-300 transform hover:scale-105 cursor-pointer"
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
                onClick={() => {
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
}
