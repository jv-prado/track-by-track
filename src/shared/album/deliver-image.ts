import { Capacitor } from "@capacitor/core";

// Cobre celular e tablet (retrato e paisagem) — mesmo corte usado pro
// breakpoint `lg` do Tailwind. Um iPad já é "desktop" pro layout da sidebar
// (>= 768px), mas em largura de tela continua sendo um tablet com Instagram
// instalado: é nessa faixa que o usuário quer o menu nativo de
// compartilhamento, não um download.
const MOBILE_OR_TABLET_QUERY = "(max-width: 1024px)";

/**
 * `canShare({ files })` responde true no Chrome/Edge do Windows, mas a share
 * sheet do SO às vezes nunca abre — e a promise de `navigator.share()` fica
 * pendente pra sempre, deixando o botão em loading eterno sem imagem nem erro.
 * No desktop o download resolve o mesmo problema e sempre termina, então o
 * menu nativo fica restrito a telas pequenas (celular/tablet) / app nativo.
 */
function prefersNativeShare(): boolean {
  if (Capacitor.isNativePlatform()) return true;
  return window.matchMedia?.(MOBILE_OR_TABLET_QUERY).matches ?? false;
}

/**
 * Entrega uma imagem gerada pelo caminho que o aparelho aceita: no celular, o
 * menu nativo de compartilhamento; no desktop, download. `canShare({ files })`
 * é o teste certo pro arquivo — `navigator.share` existe em browsers que
 * recusam arquivo.
 */
export async function deliverImageBlob(
  blob: Blob,
  filename: string,
  shareTitle?: string,
): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: "image/png" });

  if (prefersNativeShare() && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: shareTitle });
    return "shared";
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Revogar na mesma tick cancela o download em Firefox/Safari — a URL precisa
  // sobreviver até o browser começar a ler o blob.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "downloaded";
}
