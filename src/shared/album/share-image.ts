import { renderShareCard, type ShareCardData } from "./share-card";
import { deliverImageBlob } from "./deliver-image";

/** `/`, `:` e `?` num nome de álbum quebram o download no Windows. */
function toFilename(albumName: string): string {
  const safe = albumName.replace(/[\\/:*?"<>|]+/g, "-").trim();
  return `${safe || "track-by-track"}.png`;
}

export async function shareCardImage(data: ShareCardData): Promise<"shared" | "downloaded"> {
  const blob = await renderShareCard(data);
  return deliverImageBlob(blob, toFilename(data.albumName), data.albumName);
}
