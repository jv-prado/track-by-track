import { env } from "@/app/env";
import logoUrl from "@/assets/logo-icon.png";
import {
  GOLD,
  INK,
  MUTED,
  WHITE,
  clearShadow,
  drawBrandBackground,
  drawBrandFooter,
  drawBrandLogo,
  drawGlassCard,
  font,
  fontsReady,
  loadImage,
  roundedRectPath,
  toPngBlob,
  truncate,
  wrapLines,
} from "../canvas-kit";

export const DEFAULT_ANNOUNCEMENT_COPY = "Now available to rate on Track by Track";

export interface AlbumAnnouncementPostData {
  albumId: string;
  albumName: string;
  artist: string;
  /** Reusable/configurable — defaults to DEFAULT_ANNOUNCEMENT_COPY. Always shown in English. */
  copyText?: string;
}

// Feed post do Instagram (3:4) — mesmo material de marca do story (9:16) em
// share-card.ts, só que num canvas mais baixo e sem o conteúdo por usuário
// (review, destaques, avatar): aqui o "usuário" é sempre a própria plataforma
// anunciando que o álbum já pode ser avaliado.
const WIDTH = 1080;
const HEIGHT = 1440;
const SIDE_PADDING = 96;
const CONTENT_WIDTH = WIDTH - SIDE_PADDING * 2;

const COVER_RADIUS = 28;
const COVER_SIZES = [720, 680, 640, 600, 560, 520, 480];

const LOGO_CY = 136;
const LOGO_RADIUS = 76;

const FOOTER_DIVIDER_Y = HEIGHT - 158;
const FOOTER_LINE_Y = HEIGHT - 98;

// Faixa vertical livre entre o logo (topo) e o rodapé de marca (base) — o
// bloco capa → nome → artista → badge é centralizado dentro dela.
const CONTENT_TOP = LOGO_CY + LOGO_RADIUS + 60;
const CONTENT_BOTTOM = FOOTER_DIVIDER_Y - 44;
const AVAILABLE_HEIGHT = CONTENT_BOTTOM - CONTENT_TOP;

const ALBUM_NAME_SIZE = 52;
const ALBUM_NAME_LINE_HEIGHT = 60;
const ALBUM_NAME_MAX_LINES = 3;
const ARTIST_SIZE = 34;

const BADGE_FONT_SIZE = 28;
const BADGE_LINE_HEIGHT = 38;
const BADGE_PADDING_X = 40;
const BADGE_PADDING_Y = 24;
const BADGE_MAX_LINES = 2;
const BADGE_MAX_WIDTH = CONTENT_WIDTH - 40;

interface ContentLayout {
  coverSize: number;
  coverX: number;
  coverY: number;
  albumNameLines: string[];
  albumNameY: number;
  artistY: number;
  badgeLines: string[];
  badgeTop: number;
  badgeWidth: number;
  badgeHeight: number;
}

function measureLayout(
  ctx: CanvasRenderingContext2D,
  coverSize: number,
  albumNameLines: string[],
  badgeLines: string[],
): { layout: Omit<ContentLayout, "coverX" | "badgeWidth">; height: number } {
  let cursor = 0;
  const coverY = cursor;
  cursor += coverSize + 56;
  const albumNameY = cursor;
  cursor += (albumNameLines.length - 1) * ALBUM_NAME_LINE_HEIGHT + 50;
  const artistY = cursor;
  cursor += 54;
  const badgeTop = cursor;
  const badgeHeight = BADGE_PADDING_Y * 2 + badgeLines.length * BADGE_LINE_HEIGHT;
  cursor += badgeHeight;

  return {
    layout: {
      coverSize,
      coverY,
      albumNameLines,
      albumNameY,
      artistY,
      badgeLines,
      badgeTop,
      badgeHeight,
    },
    height: cursor,
  };
}

/**
 * Mesma ideia de `layoutContent` em share-card.ts: escolhe a maior capa que
 * ainda deixa nome + artista + badge caberem, depois centraliza o bloco.
 * Aqui não há blocos opcionais (review, destaques) — só o nome do álbum e a
 * legenda variam em número de linhas.
 */
function layoutContent(
  ctx: CanvasRenderingContext2D,
  data: Required<Pick<AlbumAnnouncementPostData, "albumName">> & { copyText: string },
): ContentLayout {
  ctx.font = font(700, ALBUM_NAME_SIZE);
  const albumNameLines = wrapLines(ctx, data.albumName, CONTENT_WIDTH, ALBUM_NAME_MAX_LINES);

  ctx.font = font(600, BADGE_FONT_SIZE);
  const badgeLines = wrapLines(
    ctx,
    data.copyText,
    BADGE_MAX_WIDTH - BADGE_PADDING_X * 2,
    BADGE_MAX_LINES,
  );

  let chosen = measureLayout(ctx, COVER_SIZES[COVER_SIZES.length - 1] ?? 480, albumNameLines, badgeLines);
  for (const coverSize of COVER_SIZES) {
    const candidate = measureLayout(ctx, coverSize, albumNameLines, badgeLines);
    if (candidate.height <= AVAILABLE_HEIGHT) {
      chosen = candidate;
      break;
    }
  }

  ctx.font = font(600, BADGE_FONT_SIZE);
  const badgeWidth = Math.min(
    BADGE_MAX_WIDTH,
    Math.max(...badgeLines.map((line) => ctx.measureText(line).width)) + BADGE_PADDING_X * 2,
  );

  const offset = CONTENT_TOP + Math.max(0, (AVAILABLE_HEIGHT - chosen.height) / 2);

  return {
    ...chosen.layout,
    coverX: (WIDTH - chosen.layout.coverSize) / 2,
    badgeWidth,
    coverY: chosen.layout.coverY + offset,
    albumNameY: chosen.layout.albumNameY + offset,
    artistY: chosen.layout.artistY + offset,
    badgeTop: chosen.layout.badgeTop + offset,
  };
}

/** Capa com cantos arredondados + sombra — mesmo tratamento visual do story. */
function drawCoverArt(ctx: CanvasRenderingContext2D, cover: HTMLImageElement | null, layout: ContentLayout) {
  const { coverX, coverY, coverSize } = layout;

  ctx.save();
  ctx.shadowColor = "rgba(1, 8, 14, 0.65)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 24;
  roundedRectPath(ctx, coverX, coverY, coverSize, coverSize, COVER_RADIUS);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.restore();
  clearShadow(ctx);

  if (cover) {
    ctx.save();
    roundedRectPath(ctx, coverX, coverY, coverSize, coverSize, COVER_RADIUS);
    ctx.clip();
    ctx.drawImage(cover, coverX, coverY, coverSize, coverSize);
    ctx.restore();
  } else {
    roundedRectPath(ctx, coverX, coverY, coverSize, coverSize, COVER_RADIUS);
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fill();
  }

  roundedRectPath(ctx, coverX, coverY, coverSize, coverSize, COVER_RADIUS);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** Pílula de vidro com a legenda — único acento do post, sinaliza "isso é uma novidade". */
function drawAnnouncementBadge(ctx: CanvasRenderingContext2D, layout: ContentLayout) {
  const x = (WIDTH - layout.badgeWidth) / 2;
  drawGlassCard(ctx, x, layout.badgeTop, layout.badgeWidth, layout.badgeHeight, layout.badgeHeight / 2);

  ctx.strokeStyle = "rgba(255, 186, 8, 0.45)";
  ctx.lineWidth = 1.5;
  roundedRectPath(ctx, x, layout.badgeTop, layout.badgeWidth, layout.badgeHeight, layout.badgeHeight / 2);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = GOLD;
  ctx.font = font(600, BADGE_FONT_SIZE);
  const firstBaseline =
    layout.badgeTop + BADGE_PADDING_Y + BADGE_FONT_SIZE * 0.78;
  layout.badgeLines.forEach((line, index) => {
    ctx.fillText(line, WIDTH / 2, firstBaseline + index * BADGE_LINE_HEIGHT);
  });
}

/**
 * Desenha o post de anúncio de álbum e devolve o PNG. Função pura de desenho,
 * sem React — mesma forma de `renderShareCard` em share-card.ts.
 */
export async function renderAlbumAnnouncementPost(data: AlbumAnnouncementPostData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponível neste navegador.");

  await fontsReady();

  const [logo, cover] = await Promise.all([
    loadImage(logoUrl),
    loadImage(`${env.VITE_API_URL}/albums/${data.albumId}/cover`),
  ]);

  const copyText = data.copyText?.trim() || DEFAULT_ANNOUNCEMENT_COPY;

  drawBrandBackground(ctx, cover, WIDTH, HEIGHT);
  drawBrandLogo(ctx, logo, WIDTH / 2, LOGO_CY, LOGO_RADIUS);
  drawBrandFooter(ctx, WIDTH / 2, FOOTER_DIVIDER_Y, FOOTER_LINE_Y);

  const layout = layoutContent(ctx, { albumName: data.albumName, copyText });

  drawCoverArt(ctx, cover, layout);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = WHITE;
  ctx.font = font(700, ALBUM_NAME_SIZE);
  layout.albumNameLines.forEach((line, index) => {
    ctx.fillText(
      truncate(ctx, line, CONTENT_WIDTH),
      WIDTH / 2,
      layout.albumNameY + index * ALBUM_NAME_LINE_HEIGHT,
    );
  });

  ctx.fillStyle = MUTED;
  ctx.font = font(400, ARTIST_SIZE);
  ctx.fillText(truncate(ctx, data.artist, CONTENT_WIDTH), WIDTH / 2, layout.artistY);

  drawAnnouncementBadge(ctx, layout);

  return toPngBlob(canvas);
}
