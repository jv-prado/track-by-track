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

  // Usar o hook para obter os dados do álbum
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

  // UseReviewAlbum hook
  const {
    review,
    setReview,
    salvandoReview,
    mostrarModalReview,
    setMostrarModalReview,
    salvarReview,
    temReviewExistente,
  } = useReviewAlbum(albumId, detalhesAlbum);

  // UseMediaGlobal hook
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

  // UseAvaliacoesAlbum hook
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
    try {
      // Verificar se estamos em modo de demonstração
      const demoToken = localStorage.getItem("demo_token");
      const demoExpiry = localStorage.getItem("demo_token_expiry");
      const modoDemo =
        demoToken && demoExpiry && parseInt(demoExpiry) > Date.now();
      const usuarioFirebase = getUsuarioAtual();

      // Apenas para usuários não logados ou em modo demo, carregar do localStorage
      if (!usuarioFirebase || modoDemo) {
        // Inicializar as avaliações se não existirem
        if (!localStorage.getItem("avaliacoesFaixas")) {
          localStorage.setItem("avaliacoesFaixas", JSON.stringify({}));
        }

        // Inicializar o mapa se não existir
        if (!localStorage.getItem("mapaFaixasAlbuns")) {
          localStorage.setItem("mapaFaixasAlbuns", JSON.stringify({}));
        }

        // Carregar as avaliações
        const avaliacoesSalvas = localStorage.getItem("avaliacoesFaixas");
        if (avaliacoesSalvas) {
          try {
            const dados = JSON.parse(avaliacoesSalvas);
            setAvaliacoes(dados);
          } catch (e) {
            setAvaliacoes({});
          }
        }

        // Carregar preferências de faixas favoritas/piores
        try {
          const prefsFaixas = JSON.parse(
            localStorage.getItem(`preferencias_${albumId}`) || "{}"
          );

          if (prefsFaixas.favorita !== undefined) {
            setFaixaFavorita(prefsFaixas.favorita);
          } else if (prefsFaixas.faixaFavorita !== undefined) {
            setFaixaFavorita(prefsFaixas.faixaFavorita);
          }

          if (prefsFaixas.pior !== undefined) {
            setPiorFaixa(prefsFaixas.pior);
          } else if (prefsFaixas.piorFaixa !== undefined) {
            setPiorFaixa(prefsFaixas.piorFaixa);
          }
        } catch (e) {
          // Ignorar erro ao processar preferências
        }

        // Carregar datas de avaliação
        const datas = obterDatasAvaliacao(albumId);
        setDatasAvaliacao(datas);
      }
    } catch (erro) {
      // Erro ao carregar avaliações
    }
  }, [albumId]);

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

  // Efeito para adicionar um ouvinte para o evento de atualização de avaliações
  useEffect(() => {
    // Função para recarregar os dados quando notificado de alterações
    const atualizarDadosPorEvento = () => {
      try {
        // Verificar se estamos em modo de demonstração
        const demoToken = localStorage.getItem("demo_token");
        const demoExpiry = localStorage.getItem("demo_token_expiry");
        const modoDemo =
          demoToken && demoExpiry && parseInt(demoExpiry) > Date.now();

        if (modoDemo) {
          // Recarregar dados do localStorage
          const avaliacoesSalvas = localStorage.getItem("avaliacoesFaixas");
          if (avaliacoesSalvas) {
            try {
              const dados = JSON.parse(avaliacoesSalvas);
              setAvaliacoes(dados);

              // Recalcular o progresso
              if (faixas) {
                setProgressoAvaliacao(
                  calcularProgressoAvaliacao(faixas, dados)
                );
              }
            } catch (erroJson) {
              // Erro ao processar JSON
            }
          }

          // Verificar se há dados de faixas para este álbum
          const mapaFaixasAlbuns = JSON.parse(
            localStorage.getItem("mapaFaixasAlbuns") || "{}"
          );

          // Garantir mapeamento para todas as faixas
          if (faixas && faixas.items) {
            const mapaAtualizado = { ...mapaFaixasAlbuns };
            let atualizouMapa = false;

            faixas.items.forEach((faixa) => {
              if (!mapaAtualizado[faixa.id]) {
                mapaAtualizado[faixa.id] = albumId;
                atualizouMapa = true;
              }
            });

            // Se houve atualização, salvar o mapa
            if (atualizouMapa) {
              localStorage.setItem(
                "mapaFaixasAlbuns",
                JSON.stringify(mapaAtualizado)
              );

              // Notificar alterações
              notificarAvaliacoesAlteradas();
            }
          }
        }
      } catch (erro) {
        // Erro ao atualizar dados
      }
    };

    // Adicionar listener para o evento
    window.addEventListener("avaliacoes_alteradas", atualizarDadosPorEvento);

    // Remover listener quando o componente for desmontado
    return () => {
      window.removeEventListener(
        "avaliacoes_alteradas",
        atualizarDadosPorEvento
      );
    };
  }, [faixas, albumId]);

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
        <button
          onClick={onVoltar}
          className="mb-4 bg-cinza py-2 px-4 rounded-lg hover:bg-cinza-escuro transition-colors text-sm cursor-pointer"
        >
          {t("albumDetails.back")}
        </button>
        <p className="text-center text-gray-400 text-base md:text-lg">
          {t("albumDetails.loadError")}
        </p>
      </div>
    );
  }

  return (
    <div className="p-1 sm:p-2 md:p-4 max-w-full overflow-hidden">
      <div className="flex justify-between items-center mb-2 md:mb-4">
        <button
          onClick={onVoltar}
          className="bg-cinza py-1 px-3 rounded-lg hover:bg-cinza-escuro transition-colors text-xs sm:text-sm cursor-pointer"
        >
          {t("albumDetails.back")}
        </button>

        {/* Botões de ação para o álbum */}
        <div className="flex gap-1 sm:gap-2 items-center sm:items-end">
          <button
            onClick={resetarAvaliacoesAlbum}
            className="bg-gray-700 hover:bg-gray-600 text-white py-1 px-2 rounded-lg transition-colors text-xs sm:text-sm flex items-center gap-1 cursor-pointer"
            title={t("albumDetails.reset")}
          >
            <FaUndo className="text-xs" />
            <span className="hidden sm:inline">{t("albumDetails.reset")}</span>
          </button>

          <button
            onClick={removerAlbum}
            className="bg-red-900 hover:bg-red-800 text-white py-1 px-2 rounded-lg transition-colors text-xs sm:text-sm flex items-center gap-1 cursor-pointer"
            title={t("albumDetails.remove")}
          >
            <FaTrash className="text-xs" />
            <span className="hidden sm:inline">{t("albumDetails.remove")}</span>
          </button>
        </div>
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

      {/* Modal de confirmação existente */}
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

      <div className="flex flex-col lg:flex-row gap-3 lg:gap-6 mb-3 lg:mb-6">
        {/* Capa do álbum */}
        <div className="flex-shrink-0 mx-auto lg:mx-0 flex items-center justify-center">
          {detalhesAlbum.images && detalhesAlbum.images.length > 0 && (
            <img
              src={detalhesAlbum.images[0].url}
              alt={`${detalhesAlbum.name}`}
              className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 lg:w-60 lg:h-60 object-cover rounded-lg shadow-xl border-2 border-gray-700 transition-transform duration-300 hover:scale-105 hover:shadow-2xl"
              style={{ aspectRatio: "1 / 1", background: "#18181b" }}
            />
          )}
        </div>

        {/* Informações do álbum */}
        <div className="flex flex-col mt-0 lg:mt-0 flex-grow min-w-0">
          <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-verde-destaque mb-0.5 text-center lg:text-left truncate">
            {detalhesAlbum.name}
          </h2>

          <p className="text-base sm:text-lg md:text-xl mb-0.5 text-center  lg:text-left truncate">
            {detalhesAlbum.artists.map((a) => a.name).join(", ")}
          </p>
          <p className="mb-0.5 text-gray-400 text-center lg:text-left text-xs sm:text-sm md:text-base">
            {t("albumDetails.releaseInfo", {
              year: detalhesAlbum.release_date.substring(0, 4),
              tracks: faixas.items.length,
              duration: calcularDuracaoTotal(),
            })}
          </p>

          {/* Bloco de ações: Review + Spotify, média global e Top 3 */}
          <div className="mt-2 md:mt-3 flex flex-col gap-2 w-full">
            {/* Linha de botões Review + Spotify */}
            <div className="flex w-full justify-center lg:justify-start gap-2">
              <button
                onClick={() => setMostrarModalReview(true)}
                className="bg-indigo-700 hover:bg-indigo-600 text-white py-1 px-2 rounded-lg transition-colors text-xs sm:text-sm flex items-center gap-1 cursor-pointer"
                title={
                  temReviewExistente
                    ? t("albumDetails.editReviewButton")
                    : t("albumDetails.writeReviewButton")
                }
              >
                <MdRateReview className="text-xs" />
                <span className="sm:inline">
                  {temReviewExistente
                    ? t("albumDetails.editReviewButton")
                    : t("albumDetails.writeReviewButton")}
                </span>
              </button>
              <a
                href={
                  detalhesAlbum.external_urls?.spotify ||
                  `https://open.spotify.com/album/${detalhesAlbum.id}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-600 hover:bg-green-500 text-white py-1.5 px-3 text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-all duration-300 shadow-md hover:shadow-lg rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                <FaSpotify className="text-base sm:text-lg" />
                {t("albumDetails.listenOnSpotify")}
              </a>
            </div>
            {/* Bloco de média global + Top 3, juntos na linha de baixo no mobile, lado a lado no desktop */}
            <div className="flex flex-row items-start md:items-center justify-center gap-2 w-full lg:justify-start lg:relative">
              {/* Botão da média global */}
              <button
                type="button"
                className={`min-h-[39px] bg-gray-900 rounded px-1.5 py-1 flex items-center gap-0.5 shadow-md text-[11px] sm:px-2 sm:py-1 sm:gap-1 border border-gray-700 transition align-middle cursor-pointer focus:outline-none focus:ring-2 focus:ring-verde-destaque ${
                  mediaGlobal === null
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-gray-800"
                }`}
                onClick={() =>
                  mediaGlobal !== null && setMostrarPopoverMedia((v) => !v)
                }
                tabIndex={0}
                aria-label="Ver notas dos usuários"
                disabled={mediaGlobal === null}
              >
                <span className="text-[10px] sm:text-xs text-gray-300 font-medium">
                  {t("albumDetails.globalAverage")}
                </span>
                <span className="flex items-center">
                  {mediaGlobal !== null ? (
                    <>
                      <span
                        className={`text-base sm:text-lg font-bold ${obterCorNota(
                          mediaGlobal
                        )}`}
                      >
                        {Number.isInteger(mediaGlobal)
                          ? mediaGlobal
                          : mediaGlobal.toFixed(1)}
                      </span>
                      <span className="text-[10px] sm:text-xs text-gray-400 px-1">
                        / 10
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400 italic">
                      {t("albumDetails.notRatedYet")}
                    </span>
                  )}
                </span>
              </button>
              {mostrarPopoverMedia && (
                <div
                  ref={popoverMediaRef}
                  className="z-50 fixed left-1/2 top-auto bottom-auto mt-10 -translate-x-1/2 lg:absolute lg:left-0 lg:right-auto lg:top-full lg:mt-2 lg:translate-x-0 lg:translate-y-0"
                >
                  <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-lg p-3 min-w-[220px] max-w-[90vw]">
                    <span className="text-xs text-verde-destaque font-bold mb-2 block">
                      {t("albumDetails.globalAverageUsers")}
                    </span>
                    <div className="flex flex-col gap-1 max-h-[250px] overflow-y-auto">
                      {avaliacoesUsuariosAlbum.length > 0 ? (
                        <>
                          {avaliacoesUsuariosAlbum.slice(0, 10).map((av) => (
                            <span
                              key={av.usuario.id}
                              className="flex items-center gap-2 text-xs text-gray-200"
                            >
                              {av.usuario.foto ? (
                                <img
                                  src={av.usuario.foto}
                                  alt={av.usuario.nome}
                                  className="w-5 h-5 rounded-full object-cover"
                                />
                              ) : (
                                <span className="w-5 h-5 rounded-full bg-gray-700 text-gray-200 flex items-center justify-center font-bold text-xs">
                                  {av.usuario.nome?.[0]?.toUpperCase() || "?"}
                                </span>
                              )}
                              <span className="font-bold">
                                {av.usuario.nome}
                              </span>
                              <span className="ml-auto text-verde-destaque font-bold">
                                {Number.isInteger(av.mediaAvaliacao)
                                  ? av.mediaAvaliacao
                                  : av.mediaAvaliacao.toFixed(1)}
                              </span>
                            </span>
                          ))}
                          {avaliacoesUsuariosAlbum.length > 10 && (
                            <span className="text-xs text-gray-400 italic mt-2 block text-center">
                              {t("albumDetails.showingRecentRatings", {
                                shown: 10,
                                total: avaliacoesUsuariosAlbum.length,
                              })}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-gray-400 italic">
                          {t("albumDetails.notRatedYet")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {/* Botão Top 3 */}
              <button
                type="button"
                className="min-h-[39px] bg-gray-900 rounded px-1.5 py-1 flex items-center justify-center gap-0.5 shadow-md text-[11px] sm:px-2 sm:py-1 sm:gap-1 border border-gray-700 hover:bg-gray-800 transition align-middle cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-400"
                onClick={() => setMostrarPopover((v) => !v)}
                tabIndex={0}
                aria-label="Ver Top 3 favoritas/piores"
              >
                <GiPodium className="text-yellow-400 text-base" />
                <span className="text-[10px] sm:text-xs p-1.5 text-gray-300 font-bold">
                  Top 3
                </span>
              </button>
              {mostrarPopover && (
                <div
                  ref={popoverRef}
                  className="z-50 fixed left-1/2 top-auto bottom-auto mt-10 -translate-x-1/2 lg:absolute lg:left-0 lg:right-auto lg:top-full lg:mt-2 lg:translate-x-0 lg:translate-y-0"
                >
                  <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-lg p-3 min-w-[220px] max-w-[90vw]">
                    <div className="flex flex-col md:flex-row gap-3 max-h-[250px] overflow-y-auto">
                      <div className="flex flex-col items-start min-w-[120px] md:pr-4 md:border-r md:border-gray-700">
                        <span className="text-xs text-green-400 font-extrabold mb-2 ">
                          {t("albumDetails.topFavorites")}
                        </span>
                        {faixasFavoritasGlobais.length > 0 ? (
                          faixasFavoritasGlobais.map((faixa, idx) => (
                            <span
                              key={faixa.id}
                              className="flex items-center w-full justify-between gap-2 text-xs text-gray-200"
                            >
                              <span className="flex items-center min-w-0">
                                <span className="text-green-300 font-bold mr-1">
                                  {idx + 1}º
                                </span>
                                <span className="truncate flex-1">
                                  {faixa.nome}
                                </span>
                              </span>
                              <span className="ml-1 text-green-200 font-bold flex-shrink-0">
                                {faixa.percentual}%
                              </span>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            {t("albumDetails.notRatedYet")}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-start min-w-[120px] md:pl-4">
                        <span className="text-xs text-red-400 font-extrabold mb-2">
                          {t("albumDetails.topWorst")}
                        </span>
                        {faixasPioresGlobais.length > 0 ? (
                          faixasPioresGlobais.map((faixa, idx) => (
                            <span
                              key={faixa.id}
                              className="flex items-center w-full justify-between gap-2 text-xs text-gray-200"
                            >
                              <span className="flex items-center min-w-0">
                                <span className="text-red-300 font-bold mr-1">
                                  {idx + 1}º
                                </span>
                                <span className="truncate flex-1">
                                  {faixa.nome}
                                </span>
                              </span>
                              <span className="ml-1 text-red-200 font-bold flex-shrink-0">
                                {faixa.percentual}%
                              </span>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            {t("albumDetails.notRatedYet")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Nota do usuário abaixo dos botões, sem fundo e sem borda */}
            <div className="flex w-full justify-center lg:justify-start mt-2 ">
              <div className="flex flex-col items-center">
                <span
                  className={(() => {
                    const nota = calcularNotaAlbum();
                    if (progressoAvaliacao?.percentual < 100)
                      return "text-2xl sm:text-3xl font-extrabold font-extrabold text-gray-400";
                    if (nota < 4)
                      return "text-2xl sm:text-3xl font-extrabold text-red-500";
                    if (nota < 7)
                      return "text-2xl sm:text-3xl font-extrabold text-yellow-500";
                    return "text-2xl sm:text-3xl font-extrabold text-verde-destaque";
                  })()}
                >
                  {Number.isInteger(calcularNotaAlbum())
                    ? calcularNotaAlbum()
                    : calcularNotaAlbum().toFixed(1)}
                  <span className="text-base sm:text-xl text-gray-400 font-normal ml-1">
                    /10
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Barra de progresso de avaliação */}
          <div className="mt-1 md:mt-0">
            <div className="w-full max-w-[80vw] mx-auto xs:max-w-[180px] md:max-w-full">
              <div className="flex justify-between mb-1 gap-1 xs:gap-1.5 text-center md:text-left">
                <span className="text-[10px] xs:text-xs md:text-sm text-gray-400">
                  {t("albumDetails.ratingProgress")}
                </span>
                <span className="text-[10px] xs:text-xs md:text-sm text-gray-400">
                  {progressoAvaliacao?.avaliadas || 0}/
                  {progressoAvaliacao?.total || 0} (
                  {Math.floor(progressoAvaliacao?.percentual || 0)}%)
                </span>
              </div>
            </div>
            <div className="w-full max-w-[80vw] mx-auto xs:max-w-[180px] md:max-w-full md:ml-0 h-1.5 xs:h-2 md:h-2.5 lg:h-3 xl:h-3 bg-cinza/70 xs:bg-cinza rounded-full overflow-hidden relative">
              <div
                className={`h-full transition-all duration-300 ease-in-out ${
                  Math.floor(progressoAvaliacao?.percentual || 0) >= 100
                    ? "bg-verde-destaque"
                    : "bg-blue-500/50"
                }`}
                style={{
                  width: `${Math.floor(progressoAvaliacao?.percentual || 0)}%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Exibição da música favorita e pior música - Versão desktop (apenas em telas maiores que 1450px) */}
        <div className="hidden 2xl:flex flex-col justify-start gap-3 text-left ml-auto min-w-[180px] max-w-[220px] flex-shrink-0">
          {/* Seletores para música favorita e pior música */}
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

          {/* Datas de avaliação */}
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
      <div className="bg-cinza-escuro rounded-xl p-2 md:p-4 overflow-hidden mb-3">
        <h3 className="text-base md:text-2xl font-bold mb-2 md:mb-3">
          {t("albumDetails.tracks")}
        </h3>

        <div className="w-full relative">
          {/* Mobile view - sem tempo */}
          <div className="xs:hidden">
            {/* Cabeçalho */}
            <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_5.5rem] gap-x-1 mb-2">
              <div className="font-bold text-gray-400 text-center text-xs">
                #
              </div>
              <div className="font-bold text-gray-400 text-xs">
                {t("albumDetails.title")}
              </div>
              <div className="font-bold text-gray-400 ml-5 md:ml-3 text-xs pr-1">
                {t("albumDetails.rating")}
              </div>
            </div>

            {/* Linhas de faixas */}
            {faixas.items.map((faixa, index) => (
              <div
                key={faixa.id}
                className="grid grid-cols-[1.5rem_minmax(0,1fr)_5.5rem] gap-x-1 py-1.5 border-t border-gray-800"
              >
                <div className="text-gray-400 text-center text-xs self-center">
                  {index + 1}
                </div>
                {(() => {
                  // Script para definir o maxWidth conforme o tamanho da tela (5 breakpoints)
                  let maxWidth = "120px";
                  const largura = window.innerWidth;
                  if (largura < 400) {
                    maxWidth = "47vw";
                  } else if (largura < 600) {
                    maxWidth = "50vw";
                  } else if (largura < 900) {
                    maxWidth = "50vw";
                  } else if (largura < 1200) {
                    maxWidth = "27vw";
                  } else {
                    maxWidth = "60vw";
                  }
                  return (
                    <div
                      className="truncate pr-1 text-xs sm:text-sm self-center font-medium"
                      style={{ maxWidth }}
                    >
                      {faixa.name}
                    </div>
                  );
                })()}
                <div className="flex justify-end items-center pr-1">
                  <Estrelas
                    avaliacao={avaliacoes[faixa.id] || 0}
                    onChange={(estrelas) => avaliarFaixa(faixa.id, estrelas)}
                    tamanho="medio"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Tablet/Desktop view - com tempo */}
          <div className="hidden xs:block">
            {/* Cabeçalho */}
            <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_3rem_5.5rem] gap-x-1 sm:gap-x-2 mb-2">
              <div className="font-bold text-gray-400 text-center text-xs">
                #
              </div>
              <div className="font-bold text-gray-400 text-xs">
                {t("albumDetails.title")}
              </div>
              <div className="font-bold text-gray-400 text-center text-xs">
                {t("albumDetails.time")}
              </div>
              <div className="font-bold text-gray-400 text-center text-xs pr-1">
                {t("albumDetails.rating")}
              </div>
            </div>

            {/* Linhas de faixas */}
            {faixas.items.map((faixa, index) => (
              <div
                key={faixa.id}
                className="grid grid-cols-[1.5rem_minmax(0,1fr)_3rem_5.5rem] gap-x-1 sm:gap-x-2 py-1.5 border-t border-gray-800"
              >
                <div className="text-gray-400 text-center text-xs self-center">
                  {index + 1}
                </div>
                <div className="truncate pr-1 text-xs sm:text-sm self-center font-medium">
                  {faixa.name}
                </div>
                <div className="text-gray-400 text-center text-xs self-center">
                  {formatarDuracao(faixa.duration_ms)}
                </div>
                <div className="flex justify-end items-center pr-1">
                  <Estrelas
                    avaliacao={avaliacoes[faixa.id] || 0}
                    onChange={(estrelas) => avaliarFaixa(faixa.id, estrelas)}
                    tamanho="medio"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cards de preferências e histórico - Versão para telas menores que 1450px */}
      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 mt-3 2xl:hidden">
        {/* Seletores para música favorita e pior música */}
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

        {/* Card de histórico */}
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
