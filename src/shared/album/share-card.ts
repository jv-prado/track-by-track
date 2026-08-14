import { env } from "@/app/env";

export interface ShareCardTrack {
  position: number;
  name: string;
  score: number;
}

export interface ShareCardData {
  albumId: string;
  albumName: string;
  artist: string;
  averageScore: number;
  userDisplayName: string;
  topTracks: ShareCardTrack[];
}

// Formato de story (4:5) — é o que Instagram/WhatsApp exibem sem recortar.
const WIDTH = 1080;
const HEIGHT = 1350;
const COVER_SIZE = 640;
const COVER_X = (WIDTH - COVER_SIZE) / 2;
const COVER_Y = 160;

const BACKGROUND = "#161618";
const GOLD = "#d4af37";
const WHITE = "#ffffff";
const MUTED = "#9ca3af";

/**
 * A capa é buscada pelo **nosso** domínio (proxy da API): imagem de outra
 * origem sem CORS contamina o canvas e `toBlob` passa a estourar `SecurityError`.
 * `crossOrigin` continua obrigatório mesmo com o proxy — sem ele o browser não
 * pede CORS e o canvas é contaminado do mesmo jeito.
 */
function loadCover(albumId: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = `${env.VITE_API_URL}/albums/${albumId}/cover`;
  });
}

function truncate(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

/**
 * Desenha o card compartilhável e devolve o PNG. Função pura de desenho — sem
 * React e sem hook, então dá pra testar passando um canvas mock.
 *
 * Nada aqui pode estourar por falta de dado: álbum sem capa e ranking com menos
 * de 3 faixas são casos normais, não erro.
 */
export async function renderShareCard(data: ShareCardData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponível neste navegador.");

  // Fonte do app só está garantida depois disto — sem esperar, quem abre a
  // página com cache frio gera o card com a fonte de fallback.
  await document.fonts?.ready;

  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const cover = await loadCover(data.albumId);
  if (cover) {
    ctx.drawImage(cover, COVER_X, COVER_Y, COVER_SIZE, COVER_SIZE);
  } else {
    // Fallback: sem capa o card continua legível, só perde a arte.
    ctx.fillStyle = "#2a2a2e";
    ctx.fillRect(COVER_X, COVER_Y, COVER_SIZE, COVER_SIZE);
  }

  ctx.textAlign = "center";

  ctx.fillStyle = GOLD;
  ctx.font = "bold 34px Inter, system-ui, sans-serif";
  ctx.fillText("TRACK BY TRACK", WIDTH / 2, 90);

  ctx.fillStyle = WHITE;
  ctx.font = "bold 58px Inter, system-ui, sans-serif";
  ctx.fillText(truncate(ctx, data.albumName, WIDTH - 120), WIDTH / 2, COVER_Y + COVER_SIZE + 90);

  ctx.fillStyle = MUTED;
  ctx.font = "38px Inter, system-ui, sans-serif";
  ctx.fillText(truncate(ctx, data.artist, WIDTH - 120), WIDTH / 2, COVER_Y + COVER_SIZE + 145);

  ctx.fillStyle = GOLD;
  ctx.font = "bold 96px Inter, system-ui, sans-serif";
  ctx.fillText(data.averageScore.toFixed(1), WIDTH / 2, COVER_Y + COVER_SIZE + 255);

  ctx.textAlign = "left";
  ctx.font = "34px Inter, system-ui, sans-serif";
  let trackY = COVER_Y + COVER_SIZE + 330;
  for (const track of data.topTracks.slice(0, 3)) {
    ctx.fillStyle = GOLD;
    ctx.fillText(`${track.position}.`, 140, trackY);
    ctx.fillStyle = WHITE;
    ctx.fillText(truncate(ctx, track.name, 640), 200, trackY);
    ctx.fillStyle = MUTED;
    ctx.fillText(track.score.toFixed(1), 890, trackY);
    trackY += 56;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = MUTED;
  ctx.font = "30px Inter, system-ui, sans-serif";
  ctx.fillText(`@${data.userDisplayName}`, WIDTH / 2, HEIGHT - 60);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Não foi possível gerar a imagem."));
    }, "image/png");
  });
}
