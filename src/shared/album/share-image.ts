import { renderShareCard, type ShareCardData } from "./share-card";
import { deliverImageBlob } from "./deliver-image";

export async function shareCardImage(data: ShareCardData): Promise<"shared" | "downloaded"> {
  const blob = await renderShareCard(data);
  return deliverImageBlob(blob, `${data.albumName}.png`, data.albumName);
}
