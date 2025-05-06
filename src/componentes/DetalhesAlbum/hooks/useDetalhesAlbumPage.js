import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import useDetalhesAlbum from "./useDetalhesAlbum";
import useAvaliacoesAlbum from "./useAvaliacoesAlbum";
import useReviewAlbum from "./useReviewAlbum";
import useMediaGlobal from "./useMediaGlobal";
import {
  formatarData,
  recarregarAvaliacoes,
} from "../../../services/avaliacoes";
import { notificarAvaliacoesAlteradas } from "../../../services/sync";
import {
  updateMetaTag,
  removerMetadadosOpenGraph,
  handleClickOutside,
  calcularDuracaoTotal,
  obterCorNota,
  formatarDuracao,
  calcularMediaAvaliacoes,
} from "../utils";
import { obterAlbunsAvaliados } from "../../../services/firebase";

export default function useDetalhesAlbumPage(albumIdProp, onVoltarProp) {
  const { t } = useTranslation();
  const { id: albumIdParam } = useParams();
  const navigate = useNavigate();
  const albumId = albumIdProp || albumIdParam;

  // Hooks de dados
  const detalhesAlbumHook = useDetalhesAlbum(albumId);
  const reviewAlbumHook = useReviewAlbum(
    albumId,
    detalhesAlbumHook.detalhesAlbum
  );
  const mediaGlobalHook = useMediaGlobal(albumId, detalhesAlbumHook.faixas);
  const avaliacoesAlbumHook = useAvaliacoesAlbum(
    albumId,
    detalhesAlbumHook.detalhesAlbum,
    detalhesAlbumHook.faixas,
    detalhesAlbumHook.avaliacoes,
    detalhesAlbumHook.setAvaliacoes,
    detalhesAlbumHook.faixaFavorita,
    detalhesAlbumHook.setFaixaFavorita,
    detalhesAlbumHook.piorFaixa,
    detalhesAlbumHook.setPiorFaixa,
    detalhesAlbumHook.setProgressoAvaliacao,
    detalhesAlbumHook.setDatasAvaliacao,
    reviewAlbumHook.review
  );

  // Buscar mediaAvaliacao do banco explicitamente
  const [mediaAvaliacaoBanco, setMediaAvaliacaoBanco] = useState(undefined);
  useEffect(() => {
    async function fetchMediaAvaliacao() {
      try {
        const albuns = await obterAlbunsAvaliados();
        const albumBanco = albuns.find((a) => a.id === albumId);
        if (albumBanco && albumBanco.mediaAvaliacao !== undefined) {
          setMediaAvaliacaoBanco(albumBanco.mediaAvaliacao);
        } else {
          setMediaAvaliacaoBanco(undefined);
        }
      } catch (e) {
        setMediaAvaliacaoBanco(undefined);
      }
    }
    if (albumId) fetchMediaAvaliacao();
  }, [albumId]);

  // Adicionar mediaAvaliacao ao objeto detalhesAlbum retornado
  const detalhesAlbumComMedia = detalhesAlbumHook.detalhesAlbum
    ? {
        ...detalhesAlbumHook.detalhesAlbum,
        mediaAvaliacao: mediaAvaliacaoBanco,
      }
    : { mediaAvaliacao: mediaAvaliacaoBanco };

  // Função de voltar personalizada ou padrão
  const onVoltar = () => {
    recarregarAvaliacoes();
    notificarAvaliacoesAlteradas();
    setTimeout(() => {
      if (onVoltarProp) {
        onVoltarProp();
      } else {
        navigate(-1);
      }
    }, 100);
  };

  // Efeito para atualizar o título/metadados
  useEffect(() => {
    if (detalhesAlbumHook.detalhesAlbum) {
      document.title = "Track by Track";
      const novaUrl = `/spotify/album/${albumId}`;
      window.history.replaceState(
        { albumId: albumId },
        document.title,
        novaUrl
      );
      updateMetaTag("og:title", "Track by Track");
      updateMetaTag(
        "og:description",
        `Ouça ${detalhesAlbumHook.detalhesAlbum.name} de ${detalhesAlbumHook.detalhesAlbum.artists[0].name} no Spotify`
      );
      if (
        detalhesAlbumHook.detalhesAlbum.images &&
        detalhesAlbumHook.detalhesAlbum.images.length > 0
      ) {
        updateMetaTag(
          "og:image",
          detalhesAlbumHook.detalhesAlbum.images[0].url
        );
      }
      if (
        detalhesAlbumHook.detalhesAlbum.external_urls &&
        detalhesAlbumHook.detalhesAlbum.external_urls.spotify
      ) {
        updateMetaTag(
          "og:url",
          detalhesAlbumHook.detalhesAlbum.external_urls.spotify
        );
        let linkTag = document.querySelector('link[rel="canonical"]');
        if (linkTag) {
          linkTag.href = detalhesAlbumHook.detalhesAlbum.external_urls.spotify;
        } else {
          linkTag = document.createElement("link");
          linkTag.rel = "canonical";
          linkTag.href = detalhesAlbumHook.detalhesAlbum.external_urls.spotify;
          document.head.appendChild(linkTag);
        }
      }
    }
    return () => {
      document.title = "Track by Track";
      removerMetadadosOpenGraph();
    };
  }, [detalhesAlbumHook.detalhesAlbum, albumId]);

  // Efeito para fechar popover ao clicar fora
  useEffect(() => {
    function handleClick(event) {
      handleClickOutside(
        event,
        mediaGlobalHook.popoverRef,
        mediaGlobalHook.setMostrarPopover,
        mediaGlobalHook.popoverMediaRef,
        mediaGlobalHook.setMostrarPopoverMedia
      );
    }
    if (mediaGlobalHook.mostrarPopover || mediaGlobalHook.mostrarPopoverMedia) {
      document.addEventListener("mousedown", handleClick, true);
    } else {
      document.removeEventListener("mousedown", handleClick, true);
    }
    return () => {
      document.removeEventListener("mousedown", handleClick, true);
    };
  }, [mediaGlobalHook.mostrarPopover, mediaGlobalHook.mostrarPopoverMedia]);

  return {
    t,
    albumId,
    onVoltar,
    ...detalhesAlbumHook,
    detalhesAlbum: detalhesAlbumComMedia,
    ...reviewAlbumHook,
    ...mediaGlobalHook,
    ...avaliacoesAlbumHook,
    calcularDuracaoTotal,
    obterCorNota,
    formatarDuracao,
    calcularMediaAvaliacoes,
    formatarData,
  };
}
