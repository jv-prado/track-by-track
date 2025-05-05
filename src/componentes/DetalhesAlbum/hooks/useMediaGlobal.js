import { useState, useEffect, useRef } from "react";
import { obterAvaliacoesGlobais } from "../../../services/firebase";

export default function useMediaGlobal(albumId, faixas) {
  const [mediaGlobal, setMediaGlobal] = useState(null);
  const [faixasFavoritasGlobais, setFaixasFavoritasGlobais] = useState([]);
  const [faixasPioresGlobais, setFaixasPioresGlobais] = useState([]);
  const [avaliacoesUsuariosAlbum, setAvaliacoesUsuariosAlbum] = useState([]);
  const [mostrarPopover, setMostrarPopover] = useState(false);
  const popoverRef = useRef();
  const [mostrarPopoverMedia, setMostrarPopoverMedia] = useState(false);
  const popoverMediaRef = useRef();

  // Buscar média global do álbum ao carregar
  useEffect(() => {
    async function fetchMediaGlobal() {
      if (!albumId) return;
      try {
        const avaliacoes = await obterAvaliacoesGlobais(500);
        // Filtrar apenas avaliações do álbum atual e com progresso 100%
        const avaliacoesDoAlbum = avaliacoes.filter(
          (av) =>
            av.id === albumId && av.progresso && av.progresso.percentual >= 100
        );
        setAvaliacoesUsuariosAlbum(avaliacoesDoAlbum);

        if (avaliacoesDoAlbum.length > 0) {
          // Média global
          const soma = avaliacoesDoAlbum.reduce(
            (acc, av) => acc + av.mediaAvaliacao,
            0
          );
          const media = soma / avaliacoesDoAlbum.length;
          setMediaGlobal(media);

          // Contagem de favoritas e piores
          const contagemFavoritas = {};
          const contagemPiores = {};
          let totalFavoritas = 0;
          let totalPiores = 0;
          avaliacoesDoAlbum.forEach((av) => {
            if (av.preferencias && av.preferencias.faixaFavorita) {
              contagemFavoritas[av.preferencias.faixaFavorita] =
                (contagemFavoritas[av.preferencias.faixaFavorita] || 0) + 1;
              totalFavoritas++;
            }
            if (av.preferencias && av.preferencias.piorFaixa) {
              contagemPiores[av.preferencias.piorFaixa] =
                (contagemPiores[av.preferencias.piorFaixa] || 0) + 1;
              totalPiores++;
            }
          });

          // Obter nomes das faixas
          const nomesFaixas = {};
          if (faixas && faixas.items && Array.isArray(faixas.items)) {
            faixas.items.forEach((f) => {
              nomesFaixas[f.id] = f.name;
            });
          } else if (
            avaliacoesDoAlbum[0] &&
            avaliacoesDoAlbum[0].faixas &&
            Array.isArray(avaliacoesDoAlbum[0].faixas)
          ) {
            avaliacoesDoAlbum[0].faixas.forEach((f) => {
              nomesFaixas[f.id] = f.nome;
            });
          }

          // Top 3 favoritas
          const favoritas = Object.entries(contagemFavoritas)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([id, count]) => ({
              id,
              nome: nomesFaixas[id] || id,
              percentual:
                totalFavoritas > 0
                  ? Math.round((count / totalFavoritas) * 100)
                  : 0,
            }));
          setFaixasFavoritasGlobais(favoritas);

          // Top 3 piores
          const piores = Object.entries(contagemPiores)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([id, count]) => ({
              id,
              nome: nomesFaixas[id] || id,
              percentual:
                totalPiores > 0 ? Math.round((count / totalPiores) * 100) : 0,
            }));
          setFaixasPioresGlobais(piores);
        } else {
          setMediaGlobal(null);
          setFaixasFavoritasGlobais([]);
          setFaixasPioresGlobais([]);
        }
      } catch (e) {
        console.error("Erro ao buscar média global:", e);
        setMediaGlobal(null);
        setFaixasFavoritasGlobais([]);
        setFaixasPioresGlobais([]);
      }
    }
    fetchMediaGlobal();
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

  return {
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
  };
}
