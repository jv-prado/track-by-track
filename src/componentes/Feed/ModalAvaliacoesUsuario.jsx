import React, { useState, useEffect } from "react";
import { obterAvaliacoesUsuario } from "../../services/firebase";
import { buscarFaixasPorAlbum } from "../../services/spotify";
import { formatarData } from "../../services/avaliacoes";
import { IoMdClose } from "react-icons/io";
import { FaSpotify } from "react-icons/fa";
import Carregamento from "../Feedback/Carregamento";
import Estrelas from "../Avaliacao/Estrelas";
import { IoMdHeart, IoMdHeartDislike } from "react-icons/io";

/**
 * Modal para exibir avaliações de um usuário específico para um álbum
 * @param {Object} props - Propriedades do componente
 * @param {string} props.usuarioId - ID do usuário
 * @param {string} props.albumId - ID do álbum
 * @param {Function} props.onClose - Função para fechar o modal
 * @returns {JSX.Element} Componente de modal
 */
const ModalAvaliacoesUsuario = ({ usuarioId, albumId, onClose }) => {
  const [avaliacao, setAvaliacao] = useState(null);
  const [faixasSpotify, setFaixasSpotify] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [mediaCalculada, setMediaCalculada] = useState(0);

  // Carregar avaliações do usuário para o álbum
  useEffect(() => {
    const carregarDados = async () => {
      try {
        setCarregando(true);

        // Carregar em paralelo as avaliações e as faixas do Spotify
        const [dadosAvaliacao, dadosFaixas] = await Promise.all([
          obterAvaliacoesUsuario(usuarioId, albumId),
          buscarFaixasPorAlbum(albumId),
        ]);

        setAvaliacao(dadosAvaliacao);
        setFaixasSpotify(dadosFaixas);

        // Calcular média das avaliações
        if (
          dadosAvaliacao?.avaliacoes &&
          Object.keys(dadosAvaliacao.avaliacoes).length > 0
        ) {
          const notas = Object.values(dadosAvaliacao.avaliacoes);
          const soma = notas.reduce((total, nota) => total + (nota || 0), 0);
          const media = soma / notas.length;
          // Converter para escala 0-10
          setMediaCalculada(parseFloat((media * 2).toFixed(1)));
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        setErro("Não foi possível carregar as avaliações deste usuário.");
      } finally {
        setCarregando(false);
      }
    };

    carregarDados();
  }, [usuarioId, albumId]);

  // Função para obter o nome da faixa a partir do ID
  const obterNomeFaixa = (faixaId) => {
    // Primeiro procurar no objeto de nomes que veio do Firebase
    if (avaliacao?.nomesFaixas && avaliacao.nomesFaixas[faixaId]) {
      return avaliacao.nomesFaixas[faixaId];
    }

    // Se não encontrou, procurar nas faixas do Spotify
    if (faixasSpotify?.items) {
      const faixa = faixasSpotify.items.find((f) => f.id === faixaId);
      if (faixa) return faixa.name;
    }

    // Se tudo falhar, mostrar apenas o número da faixa
    return `Faixa ${faixaId.slice(-2)}`;
  };

  // Manipulador para clicar fora do modal e fechá-lo
  const handleOverlayClick = (e) => {
    if (e.target.classList.contains("modal-overlay")) {
      onClose();
    }
  };

  // Mostrar indicador de carregamento
  if (carregando) {
    return (
      <div
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] modal-overlay"
        onClick={handleOverlayClick}
      >
        <div className="bg-cinza-escuro rounded-xl p-6 max-w-lg w-full shadow-xl">
          <Carregamento mensagem="Carregando avaliações..." />
        </div>
      </div>
    );
  }

  // Mostrar mensagem de erro
  if (erro || !avaliacao) {
    return (
      <div
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] modal-overlay"
        onClick={handleOverlayClick}
      >
        <div className="bg-cinza-escuro rounded-xl p-6 max-w-lg w-full shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-verde-destaque">
              Avaliações
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <IoMdClose size={24} />
            </button>
          </div>
          <p className="text-gray-400 text-center py-8">
            {erro || "Não foram encontradas avaliações para este álbum."}
          </p>
        </div>
      </div>
    );
  }

  // Preparar faixas ordenadas para exibição
  const faixasOrdenadas = [];

  // Se temos as faixas do Spotify, usamos elas para definir a ordem
  if (faixasSpotify?.items) {
    faixasSpotify.items.forEach((faixa, index) => {
      if (
        avaliacao.avaliacoes &&
        avaliacao.avaliacoes[faixa.id] !== undefined
      ) {
        faixasOrdenadas.push({
          id: faixa.id,
          numero: index + 1,
          nome: faixa.name,
          nota: avaliacao.avaliacoes[faixa.id] || 0,
        });
      }
    });
  } else {
    // Fallback: usar as avaliações diretamente (menos ideal, sem ordem garantida)
    if (avaliacao.avaliacoes) {
      Object.entries(avaliacao.avaliacoes).forEach(([faixaId, nota], index) => {
        faixasOrdenadas.push({
          id: faixaId,
          numero: index + 1,
          nome: obterNomeFaixa(faixaId),
          nota: nota || 0,
        });
      });
    }
  }

  // Usar a média que vem do Firebase, se disponível, ou a média calculada
  const mediaFinal =
    avaliacao.mediaAvaliacao && avaliacao.mediaAvaliacao > 0
      ? avaliacao.mediaAvaliacao
      : mediaCalculada;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] modal-overlay"
      onClick={handleOverlayClick}
    >
      <div className="bg-cinza-escuro rounded-xl p-4 md:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Cabeçalho do modal */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <h3 className="text-lg md:text-xl font-bold text-verde-destaque">
              Avaliações de {avaliacao.usuario.nome}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <IoMdClose size={24} />
          </button>
        </div>

        {/* Informações do álbum */}
        <div className="flex gap-4 mb-4 items-center">
          {avaliacao.imagem ? (
            <img
              src={avaliacao.imagem}
              alt={avaliacao.nome}
              className="w-20 h-20 object-cover rounded-lg shadow-md"
            />
          ) : (
            <div className="w-20 h-20 bg-cinza flex items-center justify-center rounded-lg">
              <span className="text-gray-400">Sem capa</span>
            </div>
          )}
          <div className="flex-grow">
            <h4 className="font-bold text-white">{avaliacao.nome}</h4>
            <p className="text-verde-destaque">{avaliacao.artista}</p>
            <p className="text-gray-400 text-sm">
              Avaliado em {formatarData(avaliacao.dataAvaliacao)}
            </p>
            <div className="mt-1">
              <a
                href={`https://open.spotify.com/album/${albumId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs text-gray-300 hover:text-green-400"
              >
                <FaSpotify className="mr-1 text-green-400" />
                Ouvir no Spotify
              </a>
            </div>
          </div>
          <div className="bg-verde-destaque text-cinza-escuro rounded-lg px-3 py-2 font-bold text-xl md:text-2xl flex items-center justify-center">
            {Number.isInteger(mediaFinal)
              ? mediaFinal.toString()
              : mediaFinal.toFixed(1)}
          </div>
        </div>

        {/* Lista de avaliações das faixas */}
        <div className="mb-2">
          <h4 className="font-medium text-white mb-2">Avaliações por faixa:</h4>
          <div className="bg-cinza rounded-lg p-3">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
                  <th className="pb-2 font-normal w-10 text-center">#</th>
                  <th className="pb-2 font-normal">Faixa</th>
                  <th className="pb-2 font-normal text-center">Avaliação</th>
                </tr>
              </thead>
              <tbody>
                {faixasOrdenadas.length > 0 ? (
                  faixasOrdenadas.map((faixa) => (
                    <tr
                      key={faixa.id}
                      className="border-b border-gray-800 last:border-b-0"
                    >
                      <td className="py-2 text-xs text-gray-400 text-center">
                        {faixa.numero}
                      </td>
                      <td className="py-2 text-sm">{faixa.nome}</td>
                      <td className="py-2 text-center">
                        <div className="flex justify-center">
                          <Estrelas
                            avaliacao={faixa.nota}
                            somenteLeitura={true}
                            tamanho="pequeno"
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="py-3 text-center text-gray-400">
                      Nenhuma faixa avaliada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Favoritas e piores */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {avaliacao.preferencias?.faixaFavorita && (
            <div className="bg-cinza rounded-lg p-3">
              <h5 className="text-sm text-red-400 mb-1 flex items-center gap-1">
                <IoMdHeart className="text-lg" /> Música Favorita
              </h5>
              <p className="text-white font-medium text-xs">
                {avaliacao.preferencias.faixaFavoritaNome ||
                  obterNomeFaixa(avaliacao.preferencias.faixaFavorita)}
              </p>
            </div>
          )}

          {avaliacao.preferencias?.piorFaixa && (
            <div className="bg-cinza rounded-lg p-3">
              <h5 className="text-sm text-yellow-500 mb-1 flex items-center gap-1">
                <IoMdHeartDislike className="text-lg" /> Pior Música
              </h5>
              <p className="text-white font-medium text-xs">
                {avaliacao.preferencias.piorFaixaNome ||
                  obterNomeFaixa(avaliacao.preferencias.piorFaixa)}
              </p>
            </div>
          )}
        </div>

        {/* Botão de fechar */}
        <div className="text-center mt-4">
          <button
            onClick={onClose}
            className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalAvaliacoesUsuario;
