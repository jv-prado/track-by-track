// Função para formatar duração em minutos:segundos
export function formatarDuracao(ms) {
  const minutos = Math.floor(ms / 60000);
  const segundos = Math.floor((ms % 60000) / 1000);
  return `${minutos}:${segundos < 10 ? "0" : ""}${segundos}`;
}

// Função para calcular duração total do álbum
export function calcularDuracaoTotal(faixas) {
  if (!faixas || !faixas.items || faixas.items.length === 0) {
    return "0:00";
  }
  const totalMs = faixas.items.reduce(
    (total, faixa) => total + faixa.duration_ms,
    0
  );
  const minutos = Math.floor(totalMs / 60000);
  const segundos = Math.floor((totalMs % 60000) / 1000);
  return `${minutos}:${segundos < 10 ? "0" : ""}${segundos}`;
}

// Função para calcular média de avaliações do álbum
export function calcularMediaAvaliacoes(faixas, avaliacoes) {
  if (!faixas || !faixas.items || faixas.items.length === 0) {
    return 0;
  }
  const soma = faixas.items.reduce(
    (total, faixa) => total + (avaliacoes[faixa.id] || 0),
    0
  );
  const mediaEm5 = soma / faixas.items.length;
  return parseFloat((mediaEm5 * 2).toFixed(1));
}

// Função para determinar a cor da nota baseada no valor
export function obterCorNota(nota) {
  const notaNum = parseFloat(nota);
  if (notaNum < 4) return "text-red-500";
  if (notaNum < 7) return "text-yellow-500";
  return "text-green-500";
}

// Função para atualizar ou criar uma meta tag no head
export function updateMetaTag(property, content) {
  let metaTag = document.querySelector(`meta[property="${property}"]`);
  if (metaTag) {
    metaTag.setAttribute("content", content);
  } else {
    metaTag = document.createElement("meta");
    metaTag.setAttribute("property", property);
    metaTag.setAttribute("content", content);
    document.head.appendChild(metaTag);
  }
}

// Função para remover metatags OpenGraph e link canônico
export function removerMetadadosOpenGraph() {
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
}

// Função utilitária para fechar popovers ao clicar fora
export function handleClickOutside(
  event,
  popoverRef,
  setMostrarPopover,
  popoverMediaRef,
  setMostrarPopoverMedia
) {
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
