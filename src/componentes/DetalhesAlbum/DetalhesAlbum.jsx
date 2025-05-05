import React, { useState, useEffect, useRef } from "react";
import Estrelas from "../Avaliacao/Estrelas";
import { MdReportProblem, MdRateReview } from "react-icons/md";
import { IoMdHeart, IoMdHeartDislike } from "react-icons/io";
import { FaTrash, FaUndo, FaSpotify } from "react-icons/fa";
import { GiPodium } from "react-icons/gi";
import { notificarAvaliacoesAlteradas } from "../../services/sync";
import { useParams, useNavigate } from "react-router-dom";
import Carregamento from "../Feedback/Carregamento";
import ErroCarregamento from "../Feedback/ErroCarregamento";
import { calcularDuracaoTotal, obterCorNota, formatarDuracao } from "./utils";
import useDetalhesAlbum from "./hooks/useDetalhesAlbum";
import useAvaliacoesAlbum from "./hooks/useAvaliacoesAlbum";
import useReviewAlbum from "./hooks/useReviewAlbum";
import useMediaGlobal from "./hooks/useMediaGlobal";
import { formatarData, recarregarAvaliacoes } from "../../services/avaliacoes";
import { useTranslation } from "react-i18next";

// Componentes modularizados
import BotoesAcao from "./componentes/BotoesAcao";
import BotaoVoltar from "./componentes/BotaoVoltar";
import CabecalhoAlbum from "./componentes/CabecalhoAlbum";
import ListaFaixas from "./componentes/ListaFaixas";
import BarraProgresso from "./componentes/BarraProgresso";
import NotaAlbum from "./componentes/NotaAlbum";
import BotoesReviewSpotify from "./componentes/BotoesReviewSpotify";

/**
 * Componente para exibir detalhes de um álbum e suas faixas
 * @param {Object} props - Propriedades do componente
 * @param {string} props.albumId - ID do álbum no Spotify (opcional)
 * @param {Function} props.onVoltar - Função para voltar à tela anterior (opcional)
 */
const DetalhesAlbum = ({ albumId: albumIdProp, onVoltar: onVoltarProp }) => {
  const { t } = useTranslation();

  // Obter parâmetros da URL
  const { id: albumIdParam } = useParams();
  const navigate = useNavigate();

  // Usar albumId da prop se disponível, caso contrário usar da URL
  const albumId = albumIdProp || albumIdParam;

  // Usar os hooks
  const {
    detalhesAlbum,
    faixas,
    carregando,
    erro,
    tentarNovamente,
    avaliacoes,
    faixaFavorita,
    piorFaixa,
    progressoAvaliacao,
    datasAvaliacao,
    setAvaliacoes,
    setFaixaFavorita,
    setPiorFaixa,
    setProgressoAvaliacao,
    setDatasAvaliacao,
  } = useDetalhesAlbum(albumId);

  const {
    review,
    setReview,
    salvandoReview,
    mostrarModalReview,
    setMostrarModalReview,
    salvarReview,
    temReviewExistente,
  } = useReviewAlbum(albumId, detalhesAlbum);

  const {
    mediaGlobal,
    faixasFavoritasGlobais,
    faixasPioresGlobais,
    avaliacoesUsuariosAlbum,
    mostrarPopover,
    setMostrarPopover,
    popoverRef,
    mostrarPopoverMedia,
    setMostrarPopoverMedia,
    popoverMediaRef,
  } = useMediaGlobal(albumId, faixas);

  const {
    avaliarFaixa,
    marcarFaixaFavorita,
    marcarPiorFaixa,
    resetarAvaliacoesAlbum,
    removerAlbum,
    cancelarAcao,
    mostrarConfirmacao,
    setMostrarConfirmacao,
    calcularMediaAvaliacoes,
  } = useAvaliacoesAlbum(
    albumId,
    detalhesAlbum,
    faixas,
    avaliacoes,
    setAvaliacoes,
    faixaFavorita,
    setFaixaFavorita,
    piorFaixa,
    setPiorFaixa,
    setProgressoAvaliacao,
    setDatasAvaliacao,
    review
  );

  // Função para calcular a nota do álbum, considerando TODAS as faixas
  // Faixas não avaliadas contam como 0 (importante para nota final)
  const calcularNotaAlbum = () => {
    if (!faixas || !faixas.items || faixas.items.length === 0) {
      return 0;
    }

    // Soma todas as notas (usando 0 para faixas não avaliadas)
    const soma = faixas.items.reduce(
      (total, faixa) => total + (avaliacoes[faixa.id] || 0),
      0
    );

    // Calcula a média
    const mediaEm5 = soma / faixas.items.length;

    // Converte para escala 0-10 e limita a 1 casa decimal
    return parseFloat((mediaEm5 * 2).toFixed(1));
  };

  // Função de voltar personalizada ou padrão
  const onVoltar = () => {
    // Primeiro, recarregar as avaliações para garantir que temos os dados mais atualizados
    recarregarAvaliacoes();

    // Depois, notificar que as avaliações foram alteradas para outros componentes detectarem
    notificarAvaliacoesAlteradas();

    // Aguardar um momento para as atualizações ocorrerem
    setTimeout(() => {
      // Chamar a função de voltar fornecida ou navegar de volta
      if (onVoltarProp) {
        onVoltarProp();
      } else {
        navigate(-1);
      }
    }, 100);
  };

  // Verificação defensiva para garantir que progressoAvaliacao seja sempre válido
  useEffect(() => {
    if (!progressoAvaliacao || typeof progressoAvaliacao !== "object") {
      setProgressoAvaliacao({
        avaliadas: 0,
        total: 0,
        percentual: 0,
      });
    }
  }, [progressoAvaliacao]);

  // Efeito para atualizar o título da página quando o álbum for carregado
  useEffect(() => {
    if (detalhesAlbum) {
      // Atualizar o título da página com o nome do álbum e do artista
      document.title = `${detalhesAlbum.name} - ${detalhesAlbum.artists[0].name} | Track-by-Track`;

      // Atualizar URL sem navegar para outra página
      const novaUrl = `/spotify/album/${albumId}`;
      window.history.replaceState(
        { albumId: albumId },
        document.title,
        novaUrl
      );

      // Atualizar metadados para compartilhamento em redes sociais (OpenGraph)
      const updateMetaTag = (property, content) => {
        let metaTag = document.querySelector(`meta[property="${property}"]`);
        if (metaTag) {
          metaTag.setAttribute("content", content);
        } else {
          metaTag = document.createElement("meta");
          metaTag.setAttribute("property", property);
          metaTag.setAttribute("content", content);
          document.head.appendChild(metaTag);
        }
      };

      // Atualizar metadados
      updateMetaTag(
        "og:title",
        `${detalhesAlbum.name} - ${detalhesAlbum.artists[0].name}`
      );
      updateMetaTag(
        "og:description",
        `Ouça ${detalhesAlbum.name} de ${detalhesAlbum.artists[0].name} no Spotify`
      );

      // Atualizar imagem se disponível
      if (detalhesAlbum.images && detalhesAlbum.images.length > 0) {
        updateMetaTag("og:image", detalhesAlbum.images[0].url);
      }

      // Adicionar link para o Spotify
      if (detalhesAlbum.external_urls && detalhesAlbum.external_urls.spotify) {
        updateMetaTag("og:url", detalhesAlbum.external_urls.spotify);

        // Adicionar link canônico para o Spotify
        let linkTag = document.querySelector('link[rel="canonical"]');
        if (linkTag) {
          linkTag.href = detalhesAlbum.external_urls.spotify;
        } else {
          linkTag = document.createElement("link");
          linkTag.rel = "canonical";
          linkTag.href = detalhesAlbum.external_urls.spotify;
          document.head.appendChild(linkTag);
        }
      }
    }

    // Ao desmontar o componente, restaurar o título original
    return () => {
      document.title = "Track-by-Track";

      // Remover metadados ao sair
      const metaTags = ["og:title", "og:description", "og:image", "og:url"];
      metaTags.forEach((property) => {
        const metaTag = document.querySelector(`meta[property="${property}"]`);
        if (metaTag) {
          metaTag.remove();
        }
      });

      // Remover link canônico
      const linkTag = document.querySelector('link[rel="canonical"]');
      if (linkTag) {
        linkTag.remove();
      }
    };
  }, [detalhesAlbum, albumId]);

  // Fechar popover ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setMostrarPopover(false);
      }
      if (
        popoverMediaRef.current &&
        !popoverMediaRef.current.contains(event.target)
      ) {
        setMostrarPopoverMedia(false);
      }
    }
    if (mostrarPopover || mostrarPopoverMedia) {
      document.addEventListener("mousedown", handleClickOutside, true);
    } else {
      document.removeEventListener("mousedown", handleClickOutside, true);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [mostrarPopover, mostrarPopoverMedia]);

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
        <BotaoVoltar onClick={onVoltar} />
        <p className="text-center text-gray-400 text-base md:text-lg">
          {t("albumDetails.loadError")}
        </p>
      </div>
    );
  }

  return (
    <div className="p-1 sm:p-2 md:p-4 max-w-full overflow-hidden">
      <div className="flex justify-between items-center mb-2 md:mb-4">
        <BotaoVoltar onClick={onVoltar} />
        <BotoesAcao
          onResetar={resetarAvaliacoesAlbum}
          onRemover={removerAlbum}
        />
      </div>
      {/* Modal de Review */}
      {mostrarModalReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] px-4">
          <div className="bg-cinza-escuro rounded-xl p-5 max-w-md w-full">
            <h3 className="text-lg font-bold text-indigo-400 mb-3 flex items-center gap-2">
              <MdRateReview />
              {t("albumDetails.albumReview", "Album Review")}
            </h3>

            <textarea
              className="w-full h-40 bg-gray-800 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              placeholder={t(
                "albumDetails.writeReview",
                "Write your review about this album..."
              )}
              value={review}
              onChange={(e) => setReview(e.target.value)}
              disabled={salvandoReview}
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setMostrarModalReview(false)}
                className="bg-gray-700 py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
                disabled={salvandoReview}
              >
                {t("albumDetails.cancel")}
              </button>
              <button
                onClick={salvarReview}
                className="bg-indigo-700 hover:bg-indigo-600 text-white py-2 px-4 rounded-lg transition-colors cursor-pointer"
                disabled={salvandoReview}
              >
                {salvandoReview
                  ? t("albumDetails.saving", "Salvando...")
                  : temReviewExistente
                  ? t("albumDetails.updateReview", "Atualizar Review")
                  : t("albumDetails.saveReview", "Salvar Review")}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de confirmação para resetar ou remover */}
      {mostrarConfirmacao && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] px-4">
          <div className="bg-cinza-escuro rounded-xl p-5 max-w-md w-full">
            <h3 className="text-lg font-bold text-verde-destaque mb-3">
              {mostrarConfirmacao === "resetar"
                ? t("albumDetails.resetConfirmTitle")
                : t("albumDetails.removeConfirmTitle")}
            </h3>
            <p className="text-gray-300 mb-5">
              {mostrarConfirmacao === "resetar"
                ? t("albumDetails.resetConfirmMessage")
                : t("albumDetails.removeConfirmMessage")}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelarAcao}
                className="bg-gray-700 py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
              >
                {t("albumDetails.cancel")}
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
                {t("albumDetails.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Bloco principal: cabeçalho, nota, progresso e cards lado a lado em desktop */}
      <div className="flex flex-col lg:flex-row gap-3 lg:gap-6 mb-3 lg:mb-6">
        {/* Esquerda: Cabeçalho, nota, progresso - sempre juntos */}
        <div className="flex flex-col ">
          <CabecalhoAlbum
            detalhesAlbum={detalhesAlbum}
            faixas={faixas}
            calcularDuracaoTotal={calcularDuracaoTotal}
          >
            <BotoesReviewSpotify
              temReviewExistente={temReviewExistente}
              onAbrirReview={() => setMostrarModalReview(true)}
              detalhesAlbum={detalhesAlbum}
            />
            <NotaAlbum
              nota={calcularNotaAlbum()}
              percentualProgresso={progressoAvaliacao?.percentual || 0}
            />
            <BarraProgresso progressoAvaliacao={progressoAvaliacao} />
          </CabecalhoAlbum>
        </div>
        {/* Direita: Cards de favorito, pior música e histórico (apenas em telas grandes) */}
        <div className="hidden 2xl:flex flex-col justify-start gap-3 text-left ml-auto min-w-[180px] max-w-[220px] flex-shrink-0">
          {/* Card Favorito */}
          <div className="bg-gray-800 p-2 rounded-lg">
            <h4 className="text-xs font-medium text-red-500 flex items-center gap-1 mb-1">
              <IoMdHeart className="inline" /> {t("albumDetails.favoriteTrack")}
              :
            </h4>
            <select
              className="w-full bg-gray-700 text-white py-1 px-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-red-500 text-ellipsis"
              value={
                faixaFavorita === null ? "nao_aplica" : faixaFavorita || ""
              }
              onChange={(e) => {
                if (e.target.value === "nao_aplica") {
                  marcarFaixaFavorita(null);
                } else {
                  marcarFaixaFavorita(
                    e.target.value === "" ? undefined : e.target.value
                  );
                }
              }}
            >
              <option value="" disabled>
                {t("albumDetails.selectTrack", "Selecione a música...")}
              </option>
              {faixas.items.map((faixa) => (
                <option
                  key={`fav-${faixa.id}`}
                  value={faixa.id}
                  disabled={faixa.id === piorFaixa}
                >
                  {faixa.name.length > 30
                    ? faixa.name.substring(0, 28) + "..."
                    : faixa.name}
                </option>
              ))}
              <option value="nao_aplica">
                {t("albumDetails.notApplicable", "Não se aplica")}
              </option>
            </select>
          </div>

          {/* Card Pior Música */}
          <div className="bg-gray-800 p-2 rounded-lg">
            <h4 className="text-xs font-medium text-yellow-500 flex items-center gap-1 mb-1">
              <IoMdHeartDislike className="inline" />{" "}
              {t("albumDetails.worstTrack")}:
            </h4>
            <select
              className="w-full bg-gray-700 text-white py-1 px-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500 text-ellipsis"
              value={piorFaixa === null ? "nao_aplica" : piorFaixa || ""}
              onChange={(e) => {
                if (e.target.value === "nao_aplica") {
                  marcarPiorFaixa(null);
                } else {
                  marcarPiorFaixa(
                    e.target.value === "" ? undefined : e.target.value
                  );
                }
              }}
            >
              <option value="" disabled>
                {t("albumDetails.selectTrack", "Selecione a música...")}
              </option>
              {faixas.items.map((faixa) => (
                <option
                  key={`worst-${faixa.id}`}
                  value={faixa.id}
                  disabled={faixa.id === faixaFavorita}
                >
                  {faixa.name.length > 30
                    ? faixa.name.substring(0, 28) + "..."
                    : faixa.name}
                </option>
              ))}
              <option value="nao_aplica">
                {t("albumDetails.notApplicable", "Não se aplica")}
              </option>
            </select>
          </div>

          {/* Card Histórico */}
          <div className="bg-gray-800 p-2 rounded-lg">
            <h4 className="text-xs font-medium text-blue-400 flex items-center gap-1 mb-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3 inline"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {t("albumDetails.history")}:
            </h4>

            <div className="text-xs text-gray-400 mb-1">
              <span className="font-medium">
                {t("albumDetails.firstRating")}:
              </span>
              <div className="text-gray-300">
                {datasAvaliacao.temRegistro
                  ? formatarData(datasAvaliacao.primeira)
                  : t("albumDetails.noRecord")}
              </div>
            </div>

            <div className="text-xs text-gray-400">
              <span className="font-medium">
                {t("albumDetails.lastModification")}:
              </span>
              <div className="text-gray-300">
                {datasAvaliacao.temRegistro
                  ? formatarData(datasAvaliacao.ultima)
                  : t("albumDetails.noRecord")}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Lista de faixas */}
      <ListaFaixas
        faixas={faixas}
        avaliacoes={avaliacoes}
        avaliarFaixa={avaliarFaixa}
        formatarDuracao={formatarDuracao}
      />

      {/* Cards de favorito, pior música e histórico - versão mobile/tablet */}
      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 mt-3 2xl:hidden">
        {/* Card Favorito */}
        <div className="bg-gray-800 p-2 rounded-lg min-w-[160px]">
          <h4 className="text-xs font-medium text-red-500 flex items-center gap-1 mb-1">
            <IoMdHeart className="inline text-xs" />{" "}
            {t("albumDetails.favoriteTrack")}:
          </h4>
          <select
            className="w-full bg-gray-700 text-white py-1 px-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-red-500 text-ellipsis"
            value={faixaFavorita === null ? "nao_aplica" : faixaFavorita || ""}
            onChange={(e) => {
              if (e.target.value === "nao_aplica") {
                marcarFaixaFavorita(null);
              } else {
                marcarFaixaFavorita(
                  e.target.value === "" ? undefined : e.target.value
                );
              }
            }}
          >
            <option value="" disabled>
              {t("albumDetails.selectTrack", "Selecione a música...")}
            </option>
            {faixas.items.map((faixa) => (
              <option
                key={`fav-${faixa.id}`}
                value={faixa.id}
                disabled={faixa.id === piorFaixa}
              >
                {faixa.name.length > 30
                  ? faixa.name.substring(0, 28) + "..."
                  : faixa.name}
              </option>
            ))}
            <option value="nao_aplica">
              {t("albumDetails.notApplicable", "Não se aplica")}
            </option>
          </select>
        </div>

        {/* Card Pior Música */}
        <div className="bg-gray-800 p-2 rounded-lg min-w-[160px]">
          <h4 className="text-xs font-medium text-yellow-500 flex items-center gap-1 mb-1">
            <IoMdHeartDislike className="inline text-xs" />{" "}
            {t("albumDetails.worstTrack")}:
          </h4>
          <select
            className="w-full bg-gray-700 text-white py-1 px-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500 text-ellipsis"
            value={piorFaixa === null ? "nao_aplica" : piorFaixa || ""}
            onChange={(e) => {
              if (e.target.value === "nao_aplica") {
                marcarPiorFaixa(null);
              } else {
                marcarPiorFaixa(
                  e.target.value === "" ? undefined : e.target.value
                );
              }
            }}
          >
            <option value="" disabled>
              {t("albumDetails.selectTrack", "Selecione a música...")}
            </option>
            {faixas.items.map((faixa) => (
              <option
                key={`worst-${faixa.id}`}
                value={faixa.id}
                disabled={faixa.id === faixaFavorita}
              >
                {faixa.name.length > 30
                  ? faixa.name.substring(0, 28) + "..."
                  : faixa.name}
              </option>
            ))}
            <option value="nao_aplica">
              {t("albumDetails.notApplicable", "Não se aplica")}
            </option>
          </select>
        </div>

        {/* Card Histórico */}
        <div className="bg-gray-800 p-2 rounded-lg xs:col-span-2">
          <h4 className="text-xs font-medium text-blue-400 flex items-center gap-1 mb-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3 inline"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {t("albumDetails.history")}:
          </h4>

          <div className="flex flex-col xs:flex-row xs:justify-between gap-2">
            <div className="text-xs text-gray-400">
              <span className="font-medium">
                {t("albumDetails.firstRating")}:
              </span>
              <span className="ml-1 text-gray-300">
                {datasAvaliacao.temRegistro
                  ? formatarData(datasAvaliacao.primeira)
                  : t("albumDetails.noRecord")}
              </span>
            </div>

            <div className="text-xs text-gray-400">
              <span className="font-medium">
                {t("albumDetails.lastModification")}:
              </span>
              <span className="ml-1 text-gray-300">
                {datasAvaliacao.temRegistro
                  ? formatarData(datasAvaliacao.ultima)
                  : t("albumDetails.noRecord")}
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* Overlay de modal para popovers em mobile e desktop */}
      {(mostrarPopover || mostrarPopoverMedia) && (
        <div
          className="fixed inset-0 bg-black/60 z-40"
          onClick={() => {
            setMostrarPopover(false);
            setMostrarPopoverMedia(false);
          }}
        />
      )}
    </div>
  );
};

export default DetalhesAlbum;
