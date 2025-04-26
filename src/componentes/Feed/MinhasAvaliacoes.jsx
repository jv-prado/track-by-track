import { useState, useEffect } from "react";
import {
  buscarDetalhesAlbum,
  buscarFaixasPorAlbum,
} from "../../services/spotify";
import Estrelas from "../Avaliacao/Estrelas";
import DetalhesAlbum from "./DetalhesAlbum";
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import { MdReportProblem } from "react-icons/md";

/**
 * Componente para exibir álbuns avaliados pelo usuário
 * @returns {JSX.Element} Componente de álbuns avaliados
 */
const MinhasAvaliacoes = () => {
  const [albunsAvaliados, setAlbunsAvaliados] = useState([]);
  const [albunsExibidos, setAlbunsExibidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [albumSelecionado, setAlbumSelecionado] = useState(null);
  const [filtroNota, setFiltroNota] = useState({ min: 0, max: 10 });
  const [ordenacao, setOrdenacao] = useState("padrao"); // "padrao", "crescente", "decrescente"
  const [erro, setErro] = useState(null);

  // Função para obter álbum único a partir das avaliações de faixas
  const obterAlbunsUnicos = (avaliacoesFaixas) => {
    // Mapear IDs de faixas para IDs de álbuns
    const mapaDeFaixas = JSON.parse(
      localStorage.getItem("mapaFaixasAlbuns") || "{}"
    );
    const idsAlbunsAvaliados = new Set();

    // Coletar IDs de álbuns únicos que têm faixas avaliadas
    Object.entries(avaliacoesFaixas).forEach(([idFaixa, avaliacao]) => {
      if (avaliacao > 0 && mapaDeFaixas[idFaixa]) {
        idsAlbunsAvaliados.add(mapaDeFaixas[idFaixa]);
      }
    });

    return Array.from(idsAlbunsAvaliados);
  };

  // Calcular a média das avaliações para um álbum
  const calcularMediaAlbum = (idAlbum, avaliacoesFaixas, mapaFaixasAlbuns) => {
    const faixasDoAlbum = Object.entries(mapaFaixasAlbuns)
      .filter(([, albumId]) => albumId === idAlbum)
      .map(([faixaId]) => faixaId);

    if (faixasDoAlbum.length === 0) return 0;

    const somaAvaliacoes = faixasDoAlbum.reduce((soma, faixaId) => {
      return soma + (avaliacoesFaixas[faixaId] || 0);
    }, 0);

    // Média em escala de 0-5
    const media = somaAvaliacoes / faixasDoAlbum.length;
    // Convertendo para escala de 0-10 (arredondando para 1 casa decimal)
    return (media * 2).toFixed(1);
  };

  // Calcular o progresso das avaliações para um álbum
  const calcularProgressoAvaliacao = (
    idAlbum,
    avaliacoesFaixas,
    mapaFaixasAlbuns,
    totalFaixas
  ) => {
    const faixasDoAlbum = Object.entries(mapaFaixasAlbuns)
      .filter(([, albumId]) => albumId === idAlbum)
      .map(([faixaId]) => faixaId);

    if (faixasDoAlbum.length === 0 || !totalFaixas)
      return { avaliadas: 0, total: 0, percentual: 0 };

    const avaliadas = faixasDoAlbum.reduce((count, faixaId) => {
      return (
        count +
        (avaliacoesFaixas[faixaId] && avaliacoesFaixas[faixaId] > 0 ? 1 : 0)
      );
    }, 0);

    const total = totalFaixas;
    const percentual = Math.round((avaliadas / total) * 100);

    return { avaliadas, total, percentual };
  };

  // Aplicar filtros e ordenação aos álbuns
  const aplicarFiltrosEOrdenacao = () => {
    let albumsFiltrados = [...albunsAvaliados];

    // Aplicar filtro por nota
    albumsFiltrados = albumsFiltrados.filter((album) => {
      const nota = parseFloat(album.mediaAvaliacao);
      return nota >= filtroNota.min && nota <= filtroNota.max;
    });

    // Aplicar ordenação
    if (ordenacao === "crescente") {
      albumsFiltrados.sort(
        (a, b) => parseFloat(a.mediaAvaliacao) - parseFloat(b.mediaAvaliacao)
      );
    } else if (ordenacao === "decrescente") {
      albumsFiltrados.sort(
        (a, b) => parseFloat(b.mediaAvaliacao) - parseFloat(a.mediaAvaliacao)
      );
    }

    setAlbunsExibidos(albumsFiltrados);
  };

  // Alternar o modo de ordenação
  const alternarOrdenacao = () => {
    if (ordenacao === "padrao") {
      setOrdenacao("crescente");
    } else if (ordenacao === "crescente") {
      setOrdenacao("decrescente");
    } else {
      setOrdenacao("padrao");
    }
  };

  // Função para tentar novamente após um erro
  const tentarNovamente = () => {
    setErro(null);
    carregarAlbunsAvaliados();
  };

  // Buscar detalhes de um álbum com tratamento de erros
  const buscarDetalhesAlbumSeguro = async (
    idAlbum,
    avaliacoesSalvas,
    mapaFaixasAlbuns
  ) => {
    try {
      // Buscar detalhes do álbum
      const detalhesAlbum = await buscarDetalhesAlbum(idAlbum);

      let totalFaixas = 0;
      let faixasAlbum = null;

      try {
        // Tentar buscar faixas, mas prosseguir mesmo que falhe
        faixasAlbum = await buscarFaixasPorAlbum(idAlbum);
        totalFaixas = faixasAlbum.items ? faixasAlbum.items.length : 0;
      } catch (erroFaixas) {
        console.warn(
          `Não foi possível carregar faixas do álbum ${idAlbum}:`,
          erroFaixas
        );
        // Calcular total de faixas com base no mapeamento local
        const faixasDoAlbumLocal = Object.entries(mapaFaixasAlbuns)
          .filter(([, albumId]) => albumId === idAlbum)
          .map(([faixaId]) => faixaId);
        totalFaixas = faixasDoAlbumLocal.length;
      }

      // Calcular média e progresso
      const mediaAvaliacao = calcularMediaAlbum(
        idAlbum,
        avaliacoesSalvas,
        mapaFaixasAlbuns
      );

      const progressoAvaliacao = calcularProgressoAvaliacao(
        idAlbum,
        avaliacoesSalvas,
        mapaFaixasAlbuns,
        totalFaixas
      );

      return {
        ...detalhesAlbum,
        mediaAvaliacao,
        progressoAvaliacao,
      };
    } catch (error) {
      console.error(`Falha ao carregar detalhes do álbum ${idAlbum}:`, error);
      // Retornar um objeto com informações mínimas para não quebrar a interface
      return {
        id: idAlbum,
        name: "Álbum indisponível",
        artists: [{ name: "Informações não disponíveis" }],
        images: [],
        erro: true,
        mediaAvaliacao: calcularMediaAlbum(
          idAlbum,
          avaliacoesSalvas,
          mapaFaixasAlbuns
        ),
        progressoAvaliacao: { avaliadas: 0, total: 0, percentual: 0 },
      };
    }
  };

  // Carrega os álbuns avaliados
  const carregarAlbunsAvaliados = async () => {
    setCarregando(true);
    setErro(null);

    try {
      // Carregar avaliações salvas
      const avaliacoesSalvas = JSON.parse(
        localStorage.getItem("avaliacoesFaixas") || "{}"
      );
      const mapaFaixasAlbuns = JSON.parse(
        localStorage.getItem("mapaFaixasAlbuns") || "{}"
      );

      // Se não temos o mapa de faixas para álbuns, não podemos mostrar os álbuns
      if (Object.keys(mapaFaixasAlbuns).length === 0) {
        setAlbunsAvaliados([]);
        setCarregando(false);
        return;
      }

      // Obter IDs de álbuns únicos
      const idsAlbuns = obterAlbunsUnicos(avaliacoesSalvas);

      if (idsAlbuns.length === 0) {
        setAlbunsAvaliados([]);
        setCarregando(false);
        return;
      }

      // Buscar detalhes dos álbuns e suas faixas com tratamento de erros
      const promessasAlbuns = idsAlbuns.map((idAlbum) =>
        buscarDetalhesAlbumSeguro(idAlbum, avaliacoesSalvas, mapaFaixasAlbuns)
      );

      const resultados = await Promise.all(promessasAlbuns);

      // Filtrar álbuns com erro, se houver muitos erros mostrar mensagem
      const albumsComErro = resultados.filter((album) => album.erro);
      if (albumsComErro.length === resultados.length) {
        // Todos os álbuns falharam
        setErro(
          "Não foi possível carregar nenhum dos álbuns avaliados. Verifique sua conexão com a internet."
        );
        setAlbunsAvaliados([]);
      } else {
        setAlbunsAvaliados(resultados);
      }
    } catch (erro) {
      console.error("Erro ao carregar álbuns avaliados:", erro);
      setErro("Ocorreu um erro ao tentar carregar seus álbuns avaliados.");
      setAlbunsAvaliados([]);
    } finally {
      setCarregando(false);
    }
  };

  // Atualizar álbuns exibidos quando filtros ou ordenação mudarem
  useEffect(() => {
    aplicarFiltrosEOrdenacao();
  }, [filtroNota, ordenacao, albunsAvaliados]);

  useEffect(() => {
    carregarAlbunsAvaliados();
  }, []);

  // Quando um novo álbum é selecionado ou desmarcado, recarrega a lista
  useEffect(() => {
    if (!albumSelecionado) {
      // Ao voltar da visualização de detalhes, recarregar a lista
      const recarregarLista = async () => {
        try {
          // Carregar avaliações salvas
          const avaliacoesSalvas = JSON.parse(
            localStorage.getItem("avaliacoesFaixas") || "{}"
          );
          const mapaFaixasAlbuns = JSON.parse(
            localStorage.getItem("mapaFaixasAlbuns") || "{}"
          );

          if (Object.keys(mapaFaixasAlbuns).length === 0) {
            return;
          }

          // Recalcular médias e progressos de avaliações para álbuns existentes
          const albunsAtualizados = await Promise.all(
            albunsAvaliados.map(async (album) => {
              if (album.erro) {
                // Tentar novamente para álbuns que falharam anteriormente
                return await buscarDetalhesAlbumSeguro(
                  album.id,
                  avaliacoesSalvas,
                  mapaFaixasAlbuns
                );
              }

              try {
                // Buscar faixas do álbum para calcular progresso atualizado
                const faixasAlbum = await buscarFaixasPorAlbum(album.id);
                const totalFaixas = faixasAlbum.items
                  ? faixasAlbum.items.length
                  : 0;

                return {
                  ...album,
                  mediaAvaliacao: calcularMediaAlbum(
                    album.id,
                    avaliacoesSalvas,
                    mapaFaixasAlbuns
                  ),
                  progressoAvaliacao: calcularProgressoAvaliacao(
                    album.id,
                    avaliacoesSalvas,
                    mapaFaixasAlbuns,
                    totalFaixas
                  ),
                };
              } catch (erro) {
                console.warn(
                  `Não foi possível atualizar as faixas do álbum ${album.id}:`,
                  erro
                );
                // Manter as informações existentes se não conseguir atualizar
                return {
                  ...album,
                  mediaAvaliacao: calcularMediaAlbum(
                    album.id,
                    avaliacoesSalvas,
                    mapaFaixasAlbuns
                  ),
                };
              }
            })
          );

          setAlbunsAvaliados(albunsAtualizados);
        } catch (erro) {
          console.error("Erro ao recarregar álbuns avaliados:", erro);
        }
      };

      if (albunsAvaliados.length > 0) {
        recarregarLista();
      }
    }
  }, [albumSelecionado]);

  if (carregando) {
    return (
      <div className="flex justify-center p-10">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-verde-destaque"></div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="p-8 text-center">
        <div className="flex flex-col items-center justify-center">
          <MdReportProblem className="text-red-500 text-5xl mb-4" />
          <h2 className="text-2xl font-bold text-red-500 mb-4">
            Erro ao carregar
          </h2>
          <p className="text-gray-400 mb-6">{erro}</p>
          <button
            onClick={tentarNovamente}
            className="bg-verde-destaque text-cinza-escuro px-6 py-2 rounded-md hover:bg-green-500 transition-colors cursor-pointer"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (albumSelecionado) {
    return (
      <DetalhesAlbum
        albumId={albumSelecionado}
        onVoltar={() => setAlbumSelecionado(null)}
      />
    );
  }

  if (albunsAvaliados.length === 0) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-verde-destaque mb-4">
          Minhas Avaliações
        </h2>
        <p className="text-gray-400">
          Você ainda não avaliou nenhum álbum. Explore álbuns e avalie suas
          faixas para vê-los aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-verde-destaque mb-4">
        Meus Álbuns Avaliados
      </h2>

      {/* Filtros e ordenação */}
      <div className="bg-cinza-escuro rounded-xl p-3 md:p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex flex-col w-full sm:w-auto">
            <label className="text-gray-400 mb-2 text-sm">
              Filtrar por nota:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="10"
                step="0.5"
                value={filtroNota.min}
                onChange={(e) =>
                  setFiltroNota({
                    ...filtroNota,
                    min: parseFloat(e.target.value),
                  })
                }
                className="bg-cinza text-white rounded-md px-2 py-1 w-16 text-center text-sm cursor-text"
              />
              <span className="text-gray-400">a</span>
              <input
                type="number"
                min="0"
                max="10"
                step="0.5"
                value={filtroNota.max}
                onChange={(e) =>
                  setFiltroNota({
                    ...filtroNota,
                    max: parseFloat(e.target.value),
                  })
                }
                className="bg-cinza text-white rounded-md px-2 py-1 w-16 text-center text-sm cursor-text"
              />
            </div>
          </div>

          <div className="flex flex-col w-full sm:w-auto">
            <label className="text-gray-400 mb-2 text-sm">
              Ordenar por nota:
            </label>
            <button
              onClick={alternarOrdenacao}
              className="bg-cinza hover:bg-verde-destaque hover:text-cinza-escuro transition-colors px-4 py-2 rounded-md flex items-center gap-2 text-sm cursor-pointer"
            >
              <span>Nota</span>
              {ordenacao === "padrao" && <FaSort />}
              {ordenacao === "crescente" && <FaSortUp />}
              {ordenacao === "decrescente" && <FaSortDown />}
            </button>
          </div>
        </div>
      </div>

      {albunsExibidos.length === 0 ? (
        <p className="text-center text-gray-400 py-8 text-sm md:text-base">
          Nenhum álbum corresponde aos filtros selecionados.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
          {albunsExibidos.map((album) => (
            <div
              key={album.id}
              className={`flex flex-col bg-cinza-escuro rounded-xl p-3 hover:bg-cinza transition-all duration-300 transform hover:scale-105 cursor-pointer ${
                album.erro ? "border border-red-500" : ""
              }`}
              onClick={() => setAlbumSelecionado(album.id)}
            >
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
              <h3 className="font-bold text-sm md:text-base mb-1 line-clamp-2">
                {album.name}
              </h3>
              <p className="text-verde-destaque text-xs md:text-sm mb-1 line-clamp-1">
                {album.artists.map((a) => a.name).join(", ")}
              </p>

              {/* Informações de avaliação */}
              <div className="mt-auto">
                {/* Nota média */}
                <div className="flex items-center mt-2 mb-1">
                  <span className="text-base md:text-lg font-bold mr-1 text-verde-destaque">
                    {album.mediaAvaliacao}
                  </span>
                  <span className="text-xs text-gray-400">/10</span>
                </div>

                {/* Barra de progresso de avaliação */}
                {!album.erro && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400 text-[10px]">
                        Avaliado:
                      </span>
                      <span className="text-gray-400 text-[10px]">
                        {album.progressoAvaliacao.avaliadas}/
                        {album.progressoAvaliacao.total} (
                        {album.progressoAvaliacao.percentual}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-cinza rounded-full overflow-hidden">
                      <div
                        className="h-full bg-verde-destaque transition-all duration-300 ease-in-out"
                        style={{
                          width: `${album.progressoAvaliacao.percentual}%`,
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
          ))}
        </div>
      )}
    </div>
  );
};

export default MinhasAvaliacoes;
