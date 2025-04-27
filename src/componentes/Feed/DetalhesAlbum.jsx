import { useState, useEffect } from "react";
import {
  buscarFaixasPorAlbum,
  buscarDetalhesAlbum,
} from "../../services/spotify";
import Estrelas from "../Avaliacao/Estrelas";
import { MdReportProblem } from "react-icons/md";
import { IoMdHeart, IoMdHeartDislike } from "react-icons/io";
import { FaTrash, FaUndo } from "react-icons/fa";
import { notificarAvaliacoesAlteradas } from "../../services/sync";
import { useParams, useNavigate } from "react-router-dom";
import Carregamento from "../Feedback/Carregamento";
import ErroCarregamento from "../Feedback/ErroCarregamento";
import {
  calcularProgressoAvaliacao,
  registrarDataAvaliacao,
  obterDatasAvaliacao,
  formatarData,
} from "../../services/avaliacoes";

/**
 * Componente para exibir detalhes de um álbum e suas faixas
 * @param {Object} props - Propriedades do componente
 * @param {string} props.albumId - ID do álbum no Spotify (opcional)
 * @param {Function} props.onVoltar - Função para voltar à tela anterior (opcional)
 */
const DetalhesAlbum = ({ albumId: albumIdProp, onVoltar: onVoltarProp }) => {
  // Obter parâmetros da URL
  const { id: albumIdParam } = useParams();
  const navigate = useNavigate();

  // Usar albumId da prop se disponível, caso contrário usar da URL
  const albumId = albumIdProp || albumIdParam;

  // Função de voltar personalizada ou padrão
  const onVoltar = onVoltarProp || (() => navigate(-1));

  const [detalhesAlbum, setDetalhesAlbum] = useState(null);
  const [faixas, setFaixas] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [avaliacoes, setAvaliacoes] = useState({});
  const [faixaFavorita, setFaixaFavorita] = useState(null);
  const [piorFaixa, setPiorFaixa] = useState(null);
  const [progressoAvaliacao, setProgressoAvaliacao] = useState({
    avaliadas: 0,
    total: 0,
    percentual: 0,
  });
  const [erro, setErro] = useState(null);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(null);
  const [datasAvaliacao, setDatasAvaliacao] = useState({
    primeira: null,
    ultima: null,
    temRegistro: false,
  });

  // Função para calcular o progresso das avaliações
  const calcularProgressoAvaliacao = (dadosFaixas, avaliacoesFaixas) => {
    if (!dadosFaixas || !dadosFaixas.items || dadosFaixas.items.length === 0) {
      return { avaliadas: 0, total: 0, percentual: 0 };
    }

    const total = dadosFaixas.items.length;
    const avaliadas = dadosFaixas.items.reduce((count, faixa) => {
      return (
        count +
        (avaliacoesFaixas[faixa.id] && avaliacoesFaixas[faixa.id] > 0 ? 1 : 0)
      );
    }, 0);

    const percentual = Math.round((avaliadas / total) * 100);

    return { avaliadas, total, percentual };
  };

  // Carregar avaliações e preferências do localStorage
  useEffect(() => {
    const avaliacoesSalvas = localStorage.getItem("avaliacoesFaixas");
    if (avaliacoesSalvas) {
      setAvaliacoes(JSON.parse(avaliacoesSalvas));
    }

    // Carregar preferências de faixas favoritas/piores
    const prefsFaixas = JSON.parse(
      localStorage.getItem(`preferencias_${albumId}`) || "{}"
    );

    if (prefsFaixas.favorita) {
      setFaixaFavorita(prefsFaixas.favorita);
    }

    if (prefsFaixas.pior) {
      setPiorFaixa(prefsFaixas.pior);
    }

    // Carregar datas de avaliação
    const datas = obterDatasAvaliacao(albumId);
    setDatasAvaliacao(datas);
  }, [albumId]);

  // Função para tentar carregar os dados novamente
  const tentarNovamente = () => {
    setErro(null);
    setCarregando(true);
    buscarDados();
  };

  // Buscar detalhes do álbum e suas faixas
  const buscarDados = async () => {
    if (!albumId) return;

    try {
      setCarregando(true);
      setErro(null);

      // Buscar em paralelo para melhorar a performance
      const [detalhes, dadosFaixas] = await Promise.all([
        buscarDetalhesAlbum(albumId),
        buscarFaixasPorAlbum(albumId),
      ]);

      setDetalhesAlbum(detalhes);
      setFaixas(dadosFaixas);

      // Obter avaliações existentes do localStorage
      const avaliacoesExistentes = JSON.parse(
        localStorage.getItem("avaliacoesFaixas") || "{}"
      );

      // Inicializar avaliações para novas faixas, mantendo as existentes
      const novasAvaliacoes = { ...avaliacoesExistentes };
      dadosFaixas.items.forEach((faixa) => {
        if (!novasAvaliacoes[faixa.id]) {
          novasAvaliacoes[faixa.id] = 0;
        }
      });
      setAvaliacoes(novasAvaliacoes);

      // Calcular o progresso de avaliação
      setProgressoAvaliacao(
        calcularProgressoAvaliacao(dadosFaixas, novasAvaliacoes)
      );

      // Salvar mapeamento de faixas para álbuns
      const mapaFaixasAlbuns = JSON.parse(
        localStorage.getItem("mapaFaixasAlbuns") || "{}"
      );
      dadosFaixas.items.forEach((faixa) => {
        mapaFaixasAlbuns[faixa.id] = albumId;
      });
      localStorage.setItem(
        "mapaFaixasAlbuns",
        JSON.stringify(mapaFaixasAlbuns)
      );
    } catch (erro) {
      console.error("Erro ao buscar detalhes do álbum:", erro);
      setErro(
        "Não foi possível carregar os detalhes do álbum. Por favor, verifique sua conexão e tente novamente."
      );
    } finally {
      setCarregando(false);
    }
  };

  // Iniciar busca de dados quando o componente carregar
  useEffect(() => {
    buscarDados();
  }, [albumId]);

  // Função para formatar duração em minutos:segundos
  const formatarDuracao = (ms) => {
    const minutos = Math.floor(ms / 60000);
    const segundos = Math.floor((ms % 60000) / 1000);
    return `${minutos}:${segundos < 10 ? "0" : ""}${segundos}`;
  };

  // Função para calcular duração total do álbum
  const calcularDuracaoTotal = () => {
    if (!faixas || !faixas.items || faixas.items.length === 0) {
      return "0:00";
    }

    const totalMs = faixas.items.reduce((total, faixa) => {
      return total + faixa.duration_ms;
    }, 0);

    const minutos = Math.floor(totalMs / 60000);
    const segundos = Math.floor((totalMs % 60000) / 1000);

    return `${minutos}:${segundos < 10 ? "0" : ""}${segundos}`;
  };

  // Função para avaliar uma faixa
  const avaliarFaixa = (faixaId, estrelas) => {
    // Obter avaliações existentes do localStorage
    const avaliacoesExistentes = JSON.parse(
      localStorage.getItem("avaliacoesFaixas") || "{}"
    );

    // Mesclar com as novas avaliações
    const novasAvaliacoes = {
      ...avaliacoesExistentes,
      [faixaId]: estrelas,
    };

    // Atualizar estado local
    setAvaliacoes(novasAvaliacoes);

    // Atualizar o progresso de avaliação
    if (faixas) {
      setProgressoAvaliacao(
        calcularProgressoAvaliacao(faixas, novasAvaliacoes)
      );
    }

    // Salvar avaliações mescladas no localStorage
    localStorage.setItem("avaliacoesFaixas", JSON.stringify(novasAvaliacoes));
    localStorage.setItem(
      "ultima_atualizacao_avaliacoes",
      Date.now().toString()
    );

    // Registrar a data da avaliação e atualizar o estado local
    registrarDataAvaliacao(faixaId, estrelas);

    // Recarregar as datas de avaliação
    const datas = obterDatasAvaliacao(albumId);
    setDatasAvaliacao(datas);

    // Notificar que as avaliações foram alteradas para acionar a sincronização
    notificarAvaliacoesAlteradas();
  };

  // Função para marcar uma faixa como favorita
  const marcarFaixaFavorita = (faixaId) => {
    // Se clicar na mesma faixa, desmarca
    if (faixaId === faixaFavorita) {
      setFaixaFavorita(null);
    } else {
      setFaixaFavorita(faixaId);

      // Se a faixa favorita for a mesma que está marcada como pior, desmarca como pior
      if (faixaId === piorFaixa) {
        setPiorFaixa(null);
      }
    }

    // Salvar preferências no localStorage
    const preferencias = {
      favorita: faixaId === faixaFavorita ? null : faixaId,
      pior: faixaId === piorFaixa ? null : piorFaixa,
    };

    localStorage.setItem(
      `preferencias_${albumId}`,
      JSON.stringify(preferencias)
    );
  };

  // Função para marcar uma faixa como a pior
  const marcarPiorFaixa = (faixaId) => {
    // Se clicar na mesma faixa, desmarca
    if (faixaId === piorFaixa) {
      setPiorFaixa(null);
    } else {
      setPiorFaixa(faixaId);

      // Se a pior faixa for a mesma que está marcada como favorita, desmarca como favorita
      if (faixaId === faixaFavorita) {
        setFaixaFavorita(null);
      }
    }

    // Salvar preferências no localStorage
    const preferencias = {
      favorita: faixaId === faixaFavorita ? null : faixaFavorita,
      pior: faixaId === piorFaixa ? null : faixaId,
    };

    localStorage.setItem(
      `preferencias_${albumId}`,
      JSON.stringify(preferencias)
    );
  };

  // Função para calcular média de avaliações do álbum
  const calcularMediaAvaliacoes = () => {
    if (!faixas || !faixas.items || faixas.items.length === 0) {
      return 0;
    }

    const soma = faixas.items.reduce((total, faixa) => {
      return total + (avaliacoes[faixa.id] || 0);
    }, 0);

    // Convertendo para escala de 0 a 10
    const mediaEm5 = soma / faixas.items.length;
    const mediaEm10 = (mediaEm5 * 2).toFixed(1);

    return mediaEm10;
  };

  // Função para resetar as avaliações do álbum atual
  const resetarAvaliacoesAlbum = () => {
    if (!faixas || !faixas.items) return;

    // Confirmar a ação se necessário
    if (mostrarConfirmacao !== "resetar") {
      setMostrarConfirmacao("resetar");
      return;
    }

    // Obter avaliações existentes
    const avaliacoesExistentes = JSON.parse(
      localStorage.getItem("avaliacoesFaixas") || "{}"
    );

    // Criar novas avaliações zerando apenas as faixas deste álbum
    const novasAvaliacoes = { ...avaliacoesExistentes };
    faixas.items.forEach((faixa) => {
      if (novasAvaliacoes[faixa.id]) {
        novasAvaliacoes[faixa.id] = 0;
      }
    });

    // Atualizar estado local
    setAvaliacoes(novasAvaliacoes);

    // Resetar faixa favorita e pior
    setFaixaFavorita(null);
    setPiorFaixa(null);
    localStorage.removeItem(`preferencias_${albumId}`);

    // Recalcular progresso
    setProgressoAvaliacao(calcularProgressoAvaliacao(faixas, novasAvaliacoes));

    // Salvar no localStorage
    localStorage.setItem("avaliacoesFaixas", JSON.stringify(novasAvaliacoes));

    // Esconder confirmação
    setMostrarConfirmacao(null);
  };

  // Função para remover o álbum das minhas avaliações
  const removerAlbum = () => {
    if (!faixas || !faixas.items) return;

    // Confirmar a ação se necessário
    if (mostrarConfirmacao !== "remover") {
      setMostrarConfirmacao("remover");
      return;
    }

    // Obter avaliações e mapeamento de faixas
    const avaliacoesExistentes = JSON.parse(
      localStorage.getItem("avaliacoesFaixas") || "{}"
    );
    const mapaFaixasAlbuns = JSON.parse(
      localStorage.getItem("mapaFaixasAlbuns") || "{}"
    );

    // Remover avaliações das faixas deste álbum
    const novasAvaliacoes = { ...avaliacoesExistentes };
    const novoMapaFaixas = { ...mapaFaixasAlbuns };

    faixas.items.forEach((faixa) => {
      // Remover da avaliação
      if (novasAvaliacoes[faixa.id]) {
        delete novasAvaliacoes[faixa.id];
      }

      // Remover do mapeamento
      if (novoMapaFaixas[faixa.id]) {
        delete novoMapaFaixas[faixa.id];
      }
    });

    // Atualizar estados
    setAvaliacoes(novasAvaliacoes);

    // Resetar faixa favorita e pior
    setFaixaFavorita(null);
    setPiorFaixa(null);
    localStorage.removeItem(`preferencias_${albumId}`);

    // Recalcular progresso (será zero porque removemos todas)
    setProgressoAvaliacao({
      avaliadas: 0,
      total: faixas.items.length,
      percentual: 0,
    });

    // Salvar no localStorage
    localStorage.setItem("avaliacoesFaixas", JSON.stringify(novasAvaliacoes));
    localStorage.setItem("mapaFaixasAlbuns", JSON.stringify(novoMapaFaixas));

    // Esconder confirmação e voltar à lista de álbuns
    setMostrarConfirmacao(null);
    onVoltar();
  };

  // Função para cancelar a ação de confirmação
  const cancelarAcao = () => {
    setMostrarConfirmacao(null);
  };

  // Exibir indicador de carregamento
  if (carregando) {
    return <Carregamento />;
  }

  // Exibir mensagem de erro
  if (erro) {
    return (
      <ErroCarregamento mensagem={erro} onTentarNovamente={tentarNovamente} />
    );
  }

  if (!detalhesAlbum || !faixas) {
    return (
      <div className="p-3 md:p-6 overflow-hidden">
        <button
          onClick={onVoltar}
          className="mb-4 bg-cinza py-2 px-4 rounded-lg hover:bg-cinza-escuro transition-colors text-sm cursor-pointer"
        >
          Voltar
        </button>
        <p className="text-center text-gray-400 text-base md:text-lg">
          Não foi possível carregar os detalhes do álbum
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={onVoltar}
          className="bg-cinza py-2 px-4 rounded-lg hover:bg-cinza-escuro transition-colors text-sm cursor-pointer"
        >
          Voltar
        </button>

        {/* Botões de ação para o álbum */}
        <div className="flex gap-2">
          <button
            onClick={resetarAvaliacoesAlbum}
            className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded-lg transition-colors text-sm flex items-center gap-1 cursor-pointer"
            title="Resetar avaliações deste álbum"
          >
            <FaUndo className="text-xs" />
            <span className="hidden sm:inline">Resetar</span>
          </button>

          <button
            onClick={removerAlbum}
            className="bg-red-900 hover:bg-red-800 text-white py-2 px-3 rounded-lg transition-colors text-sm flex items-center gap-1 cursor-pointer"
            title="Remover álbum das avaliações"
          >
            <FaTrash className="text-xs" />
            <span className="hidden sm:inline">Remover</span>
          </button>
        </div>
      </div>

      {/* Modal de confirmação */}
      {mostrarConfirmacao && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] px-4">
          <div className="bg-cinza-escuro rounded-xl p-5 max-w-md w-full">
            <h3 className="text-lg font-bold text-verde-destaque mb-3">
              {mostrarConfirmacao === "resetar"
                ? "Resetar avaliações?"
                : "Remover álbum?"}
            </h3>
            <p className="text-gray-300 mb-5">
              {mostrarConfirmacao === "resetar"
                ? "Isso vai zerar todas as suas avaliações para este álbum. Esta ação não pode ser desfeita."
                : "Isso vai remover este álbum das suas avaliações e apagar todas as notas das faixas. Esta ação não pode ser desfeita."}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelarAcao}
                className="bg-gray-700 py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={
                  mostrarConfirmacao === "resetar"
                    ? resetarAvaliacoesAlbum
                    : removerAlbum
                }
                className={`py-2 px-4 rounded-lg transition-colors cursor-pointer ${
                  mostrarConfirmacao === "resetar"
                    ? "bg-yellow-700 hover:bg-yellow-600"
                    : "bg-red-700 hover:bg-red-600"
                }`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 md:gap-8 mb-4 md:mb-8">
        {/* Capa do álbum */}
        <div className="flex-shrink-0 mx-auto md:mx-0">
          {detalhesAlbum.images && detalhesAlbum.images.length > 0 && (
            <img
              src={detalhesAlbum.images[0].url}
              alt={`Capa do álbum ${detalhesAlbum.name}`}
              className="w-48 h-48 md:w-64 md:h-64 object-cover rounded-lg shadow-lg"
            />
          )}
        </div>

        {/* Informações do álbum */}
        <div className="flex flex-col mt-4 md:mt-0">
          <h2 className="text-xl md:text-3xl font-bold text-verde-destaque mb-1 md:mb-2 text-center md:text-left">
            {detalhesAlbum.name}
          </h2>
          <p className="text-lg md:text-xl mb-1 md:mb-2 text-center md:text-left">
            {detalhesAlbum.artists.map((a) => a.name).join(", ")}
          </p>
          <p className="text-gray-400 text-center md:text-left text-sm md:text-base">
            {detalhesAlbum.release_date.substring(0, 4)} • {faixas.items.length}{" "}
            faixas • {calcularDuracaoTotal()}
          </p>
          <div className="mt-3 md:mt-4 flex items-center justify-center md:justify-start">
            <span className="text-xl md:text-2xl font-bold mr-2 text-verde-destaque">
              {calcularMediaAvaliacoes()}
            </span>
            <span className="text-xs md:text-sm text-gray-400">/10</span>
          </div>

          {/* Barra de progresso de avaliação */}
          <div className="mt-3 md:mt-4">
            <div className="flex justify-between mb-1 gap-1">
              <span className="text-xs md:text-sm text-gray-400">
                Progresso da avaliação
              </span>
              <span className="text-xs md:text-sm text-gray-400">
                {progressoAvaliacao.avaliadas}/{progressoAvaliacao.total} (
                {progressoAvaliacao.percentual}%)
              </span>
            </div>
            <div className="w-full h-2 md:h-3 bg-cinza rounded-full overflow-hidden">
              <div
                className="h-full bg-verde-destaque transition-all duration-300 ease-in-out"
                style={{ width: `${progressoAvaliacao.percentual}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Exibição da música favorita e pior música */}
        <div className="flex flex-col justify-start gap-4 mt-4 md:mt-0 text-center md:text-left md:ml-auto md:min-w-[180px]">
          {faixaFavorita && faixas && (
            <div className="bg-gray-800 p-3 rounded-lg">
              <h4 className="text-sm font-medium text-red-500 flex items-center gap-2">
                <IoMdHeart className="inline" /> Música Favorita:
              </h4>
              <p className="text-sm text-gray-300 mt-1">
                {faixas.items.find((f) => f.id === faixaFavorita)?.name || ""}
              </p>
            </div>
          )}

          {piorFaixa && faixas && (
            <div className="bg-gray-800 p-3 rounded-lg">
              <h4 className="text-sm font-medium text-yellow-500 flex items-center gap-2">
                <IoMdHeartDislike className="inline" /> Pior Música:
              </h4>
              <p className="text-sm text-gray-300 mt-1">
                {faixas.items.find((f) => f.id === piorFaixa)?.name || ""}
              </p>
            </div>
          )}

          {/* Datas de avaliação */}
          {datasAvaliacao.temRegistro && (
            <div className="bg-gray-800 p-3 rounded-lg">
              <div className="text-xs text-gray-400 mb-1">
                <span className="font-medium">Primeira avaliação:</span>
                <div className="mt-1 text-gray-300">
                  {formatarData(datasAvaliacao.primeira)}
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-2">
                <span className="font-medium">Última avaliação:</span>
                <div className="mt-1 text-gray-300">
                  {formatarData(datasAvaliacao.ultima)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lista de faixas */}
      <div className="bg-cinza-escuro rounded-xl p-3 md:p-6">
        <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Faixas</h3>

        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-2 md:gap-x-4 gap-y-1 md:gap-y-2 text-sm md:text-base">
          <div className="font-bold text-gray-400">#</div>
          <div className="font-bold text-gray-400">Título</div>
          <div className="font-bold text-gray-400">Duração</div>
          <div className="font-bold text-gray-400">Avaliação</div>
          <div className="font-bold text-gray-400">Favorita</div>
          <div className="font-bold text-gray-400">Pior</div>

          {faixas.items.map((faixa, index) => (
            <>
              <div className="text-gray-400">{index + 1}</div>
              <div className="truncate pr-2">{faixa.name}</div>
              <div className="text-gray-400">
                {formatarDuracao(faixa.duration_ms)}
              </div>
              <div>
                <Estrelas
                  avaliacao={avaliacoes[faixa.id] || 0}
                  onChange={(estrelas) => avaliarFaixa(faixa.id, estrelas)}
                  tamanho="pequeno"
                />
              </div>
              <div className="text-center">
                <button
                  onClick={() => marcarFaixaFavorita(faixa.id)}
                  className="hover:scale-110 transition-transform focus:outline-none cursor-pointer"
                  title="Marcar como favorita"
                >
                  <IoMdHeart
                    className={`text-xl ${
                      faixa.id === faixaFavorita
                        ? "text-red-500"
                        : "text-gray-600"
                    }`}
                  />
                </button>
              </div>
              <div className="text-center">
                <button
                  onClick={() => marcarPiorFaixa(faixa.id)}
                  className="hover:scale-110 transition-transform focus:outline-none cursor-pointer"
                  title="Marcar como pior música"
                >
                  <IoMdHeartDislike
                    className={`text-xl ${
                      faixa.id === piorFaixa
                        ? "text-yellow-500"
                        : "text-gray-600"
                    }`}
                  />
                </button>
              </div>
            </>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DetalhesAlbum;
