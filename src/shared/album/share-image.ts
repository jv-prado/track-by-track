import { renderShareCard, type ShareCardData } from "./share-card";

/**
 * Entrega o card pelo caminho que o aparelho aceita: no celular, o menu nativo
 * de compartilhamento; no desktop, download. `canShare({ files })` é o teste
 * certo — `navigator.share` existe em browsers que recusam arquivo.
 */
export async function shareCardImage(data: ShareCardData): Promise<"shared" | "downloaded"> {
  const blob = await renderShareCard(data);
  const file = new File([blob], `${data.albumName}.png`, { type: "image/png" });

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: data.albumName });
    return "shared";
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
  return "downloaded";
}
