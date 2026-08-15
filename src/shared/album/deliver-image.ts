/**
 * Entrega uma imagem gerada pelo caminho que o aparelho aceita: no celular, o
 * menu nativo de compartilhamento; no desktop, download. `canShare({ files })`
 * é o teste certo — `navigator.share` existe em browsers que recusam arquivo.
 */
export async function deliverImageBlob(
  blob: Blob,
  filename: string,
  shareTitle?: string,
): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: "image/png" });

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: shareTitle });
    return "shared";
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return "downloaded";
}
