import { env } from "@/app/env";
import logoUrl from "@/assets/logo-full.png";
import bgStoryUrl from "@/assets/teste.png";
import {
  GOLD,
  INK,
  MUTED,
  PURPLE,
  WHITE,
  clearShadow,
  drawBrandBackground,
  drawBrandFooter,
  drawBrandLogo,
  drawGlassCard,
  drawImageCover,
  drawOutlineBanGlyph,
  drawOutlineHeartGlyph,
  font,
  fontsReady,
  loadImage,
  roundedRectPath,
  toPngBlob,
  truncate,
  wrapLines,
} from "./canvas-kit";

export interface ShareCardTrackHighlight {
  label: string;
  name: string;
}

export interface ShareCardData {
  albumId: string;
  albumName: string;
  artist: string;
  averageScore: number;
  /** Nota ainda pode mudar bastante antes do ranking completo — vira cinza nesse caso. */
  isScoreComplete: boolean;
  userDisplayName: string;
  userAvatarUrl?: string;
  /** Já formatada no locale ativo pelo chamador (ver `formatDate`) — este módulo não conhece i18n. */
  ratedAtLabel: string;
  /** Opcionais porque o usuário escolhe o que entra no card (ver `ShareCardOptionsSheet`). */
  favoriteTrack?: ShareCardTrackHighlight;
  worstTrack?: ShareCardTrackHighlight;
  reviewText?: string;
}

// Formato de story (9:16)
const WIDTH = 1080;
const HEIGHT = 1920;
const SIDE_PADDING = 84;
const CONTENT_WIDTH = WIDTH - SIDE_PADDING * 2;
const TEXT_MAX_WIDTH = CONTENT_WIDTH - 40;

const COVER_RADIUS = 32;

// Logo de marca no topo
const LOGO_CY = 195;
const LOGO_RADIUS = 210;

// Rodapé na base
const FOOTER_LINE_Y = 1810;

// Faixa vertical disponível para o conteúdo
const CONTENT_TOP = 330;
const CONTENT_BOTTOM = 1750;
const AVAILABLE_HEIGHT = CONTENT_BOTTOM - CONTENT_TOP;

const COVER_SIZES = [520, 480, 440, 400, 360, 320, 280];

const ALBUM_NAME_SIZE = 52;
const ALBUM_NAME_LINE_HEIGHT = 60;
const ALBUM_NAME_MAX_LINES = 3;

const AVATAR_RADIUS = 46;
const HIGHLIGHT_WIDTH = 780;
const HIGHLIGHT_ROW_HEIGHT = 88;

// Card de review
const REVIEW_PADDING = 32;
const REVIEW_HEADER_HEIGHT = 88;
const REVIEW_HEADER_TO_TEXT = 28;
const REVIEW_LINE_HEIGHT = 38;
const REVIEW_TEXT_SIZE = 28;
const REVIEW_CHROME = REVIEW_PADDING * 2 + REVIEW_HEADER_HEIGHT + REVIEW_HEADER_TO_TEXT + 24;
const REVIEW_MAX_LINES = 6;

/** Cores oficiais da nota: verde (>= 7), amarelo (4-6.9), vermelho (< 4). */
function getScoreColor(score: number, isComplete: boolean): string {
  if (!isComplete) return MUTED;
  if (score < 4) return "#f87171"; // red-400
  if (score < 7) return "#facc15"; // yellow-400
  return "#4ade80"; // green-400
}

interface ContentLayout {
  coverSize: number;
  coverX: number;
  badgeRadius: number;
  coverY: number;
  albumNameLines: string[];
  albumNameY: number;
  artistY: number;
  favoriteCardTop: number;
  worstCardTop: number;
  reviewCardTop: number;
  reviewLines: string[];
  reviewCardHeight: number;
  identityCy: number;
  height: number;
}

/**
 * Medição e empilhamento dos elementos garantindo folga entre a nota e o título do álbum.
 */
function measureLayout(
  ctx: CanvasRenderingContext2D,
  data: ShareCardData,
  coverSize: number,
  albumNameLines: string[],
  neededReviewLines: number,
): ContentLayout {
  const badgeRadius = Math.round(coverSize * 0.155);

  let cursor = 0;
  const coverY = cursor;

  // O selo da nota se estende abaixo da base da capa (cy + badgeRadius).
  // Folga garantida de 56px abaixo do selo da nota antes de iniciar o título do álbum:
  const badgeBottom = coverSize - badgeRadius * 0.2 + badgeRadius;
  cursor = Math.max(coverSize + 60, badgeBottom + 56);

  const albumNameY = cursor;
  cursor += (albumNameLines.length - 1) * ALBUM_NAME_LINE_HEIGHT + 54;
  const artistY = cursor;

  let favoriteCardTop = 0;
  if (data.favoriteTrack) {
    cursor += 48;
    favoriteCardTop = cursor;
    cursor += HIGHLIGHT_ROW_HEIGHT;
  }

  let worstCardTop = 0;
  if (data.worstTrack) {
    cursor += data.favoriteTrack ? 16 : 48;
    worstCardTop = cursor;
    cursor += HIGHLIGHT_ROW_HEIGHT;
  }

  let reviewCardTop = 0;
  let reviewLines: string[] = [];
  let reviewCardHeight = 0;
  let identityCy = 0;

  if (data.reviewText) {
    reviewCardTop = cursor + (data.favoriteTrack || data.worstTrack ? 36 : 48);
    ctx.font = font(400, REVIEW_TEXT_SIZE);
    const linesThatFit = Math.floor(
      (AVAILABLE_HEIGHT - reviewCardTop - REVIEW_CHROME) / REVIEW_LINE_HEIGHT,
    );
    const maxLines = Math.max(1, Math.min(neededReviewLines, linesThatFit));
    reviewLines = wrapLines(ctx, data.reviewText, CONTENT_WIDTH - REVIEW_PADDING * 2, maxLines);
    reviewCardHeight = REVIEW_CHROME + reviewLines.length * REVIEW_LINE_HEIGHT;
    cursor = reviewCardTop + reviewCardHeight;
  } else {
    cursor += 60 + AVATAR_RADIUS;
    identityCy = cursor;
    cursor += AVATAR_RADIUS;
  }

  return {
    coverSize,
    coverX: (WIDTH - coverSize) / 2,
    badgeRadius,
    coverY,
    albumNameLines,
    albumNameY,
    artistY,
    favoriteCardTop,
    worstCardTop,
    reviewCardTop,
    reviewLines,
    reviewCardHeight,
    identityCy,
    height: cursor,
  };
}

/**
 * Escolhe o tamanho ideal da capa e centraliza o bloco verticalmente de forma harmoniosa.
 */
function layoutContent(ctx: CanvasRenderingContext2D, data: ShareCardData): ContentLayout {
  ctx.font = font(800, ALBUM_NAME_SIZE);
  const albumNameLines = wrapLines(ctx, data.albumName, TEXT_MAX_WIDTH, ALBUM_NAME_MAX_LINES);

  let neededReviewLines = 0;
  if (data.reviewText) {
    ctx.font = font(400, REVIEW_TEXT_SIZE);
    neededReviewLines = wrapLines(
      ctx,
      data.reviewText,
      CONTENT_WIDTH - REVIEW_PADDING * 2,
      REVIEW_MAX_LINES,
    ).length;
  }

  let chosen = measureLayout(
    ctx,
    data,
    COVER_SIZES[COVER_SIZES.length - 1] ?? 280,
    albumNameLines,
    neededReviewLines,
  );

  for (const coverSize of COVER_SIZES) {
    const candidate = measureLayout(ctx, data, coverSize, albumNameLines, neededReviewLines);
    const keepsWholeReview =
      !data.reviewText || candidate.reviewLines.length >= neededReviewLines;
    if (candidate.height <= AVAILABLE_HEIGHT && keepsWholeReview) {
      chosen = candidate;
      break;
    }
  }

  const offset = CONTENT_TOP + Math.max(0, (AVAILABLE_HEIGHT - chosen.height) / 2);

  return {
    ...chosen,
    coverY: chosen.coverY + offset,
    albumNameY: chosen.albumNameY + offset,
    artistY: chosen.artistY + offset,
    favoriteCardTop: chosen.favoriteCardTop + offset,
    worstCardTop: chosen.worstCardTop + offset,
    reviewCardTop: chosen.reviewCardTop + offset,
    identityCy: chosen.identityCy + offset,
  };
}

/** Capa do álbum com glow radial dourado/roxo, sombra escura e borda fina. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  cover: HTMLImageElement | null,
  layout: ContentLayout,
) {
  const { coverX, coverY, coverSize } = layout;

  // 1. Glow atmosférico radial dourado/roxo atrás da capa
  const glowRadius = coverSize * 0.75;
  const glowCx = coverX + coverSize / 2;
  const glowCy = coverY + coverSize / 2;
  const glow = ctx.createRadialGradient(
    glowCx,
    glowCy,
    coverSize * 0.2,
    glowCx,
    glowCy,
    glowRadius,
  );
  glow.addColorStop(0, "rgba(255, 186, 8, 0.45)");
  glow.addColorStop(0.5, "rgba(93, 31, 137, 0.3)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(
    glowCx - glowRadius,
    glowCy - glowRadius,
    glowRadius * 2,
    glowRadius * 2,
  );

  // 2. Halo sutil na borda — camadas por TRÁS da capa, do maior/mais fraco pro
  // menor/mais forte. `shadowBlur` numa borda desenhada por CIMA da imagem
  // borra pra dentro também (mancha esbranquiçada sobre a foto); desenhando
  // aqui, a capa opaca cobre a parte interna de cada camada e só sobra o
  // anel que vaza pro fundo escuro — halo visível, sem manchar a arte.
  for (const { pad, alpha } of [
    { pad: 14, alpha: 0.06 },
    { pad: 9, alpha: 0.09 },
    { pad: 4, alpha: 0.14 },
  ]) {
    roundedRectPath(
      ctx,
      coverX - pad,
      coverY - pad,
      coverSize + pad * 2,
      coverSize + pad * 2,
      COVER_RADIUS + pad,
    );
    ctx.fillStyle = `rgba(186, 130, 224, ${alpha})`;
    ctx.fill();
  }

  // 3. Sombra escura profunda sob a capa
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 20;
  roundedRectPath(ctx, coverX, coverY, coverSize, coverSize, COVER_RADIUS);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.restore();
  clearShadow(ctx);

  // 4. Imagem da capa — cover-fit, preenche o quadrado inteiro sem distorcer
  if (cover) {
    ctx.save();
    roundedRectPath(ctx, coverX, coverY, coverSize, coverSize, COVER_RADIUS);
    ctx.clip();
    drawImageCover(ctx, cover, coverX, coverY, coverSize, coverSize);
    ctx.restore();
  } else {
    roundedRectPath(ctx, coverX, coverY, coverSize, coverSize, COVER_RADIUS);
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fill();
  }

  // 5. Aro fino por cima, sem blur — contorno nítido, o halo já foi resolvido acima
  roundedRectPath(ctx, coverX, coverY, coverSize, coverSize, COVER_RADIUS);
  ctx.strokeStyle = "rgba(216, 180, 235, 0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** Selo da nota com fundo escuro, aro na cor da nota (verde/amarelo/vermelho) e número correspondente. */
function drawScoreBadge(ctx: CanvasRenderingContext2D, data: ShareCardData, layout: ContentLayout) {
  const radius = layout.badgeRadius;
  const cx = layout.coverX + layout.coverSize - radius * 0.4;
  const cy = layout.coverY + layout.coverSize - radius * 0.2;
  const color = getScoreColor(data.averageScore, data.isScoreComplete);

  // Sombra escura do selo
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
  ctx.shadowBlur = 35;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = "#090511";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  clearShadow(ctx);

  // Aro na cor da nota
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Nota principal (verde/amarelo/vermelho)
  ctx.fillStyle = color;
  ctx.font = font(800, Math.round(radius * 0.7));
  ctx.fillText(data.averageScore.toFixed(1), cx, cy - radius * 0.14);

  // /10 em cinza
  ctx.fillStyle = "#9ca3af";
  ctx.font = font(600, Math.round(radius * 0.26));
  ctx.fillText("/10", cx, cy + radius * 0.42);
}

/** Linha do artista com divisores horizontais dourados nas laterais. */
function drawArtistRow(
  ctx: CanvasRenderingContext2D,
  artist: string,
  y: number,
  maxWidth: number,
) {
  ctx.save();
  ctx.font = font(600, 26);
  const upperArtist = artist.toUpperCase();
  const text = truncate(ctx, upperArtist, maxWidth - 260);
  const textWidth = ctx.measureText(text).width;
  const gap = 28;
  const lineWidth = 100;

  // Linha esquerda com degradê
  const leftX = WIDTH / 2 - textWidth / 2 - gap - lineWidth;
  const leftGrad = ctx.createLinearGradient(leftX, 0, leftX + lineWidth, 0);
  leftGrad.addColorStop(0, "rgba(255, 186, 8, 0)");
  leftGrad.addColorStop(1, "rgba(255, 186, 8, 0.7)");
  ctx.fillStyle = leftGrad;
  ctx.fillRect(leftX, y - 8, lineWidth, 1.5);

  // Nome do artista
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#d1d5db";
  ctx.fillText(text, WIDTH / 2, y);

  // Linha direita com degradê
  const rightX = WIDTH / 2 + textWidth / 2 + gap;
  const rightGrad = ctx.createLinearGradient(rightX, 0, rightX + lineWidth, 0);
  rightGrad.addColorStop(0, "rgba(255, 186, 8, 0.7)");
  rightGrad.addColorStop(1, "rgba(255, 186, 8, 0)");
  ctx.fillStyle = rightGrad;
  ctx.fillRect(rightX, y - 8, lineWidth, 1.5);

  ctx.restore();
}

/** Destaques (faixa favorita / pior faixa) com ícones vazados em dourado e divisores finos. */
function drawHighlightRow(
  ctx: CanvasRenderingContext2D,
  highlight: ShareCardTrackHighlight,
  top: number,
  variant: "favorite" | "worst",
) {
  const startX = (WIDTH - HIGHLIGHT_WIDTH) / 2;
  const iconCx = startX + 32;
  const iconCy = top + 34;

  if (variant === "favorite") {
    drawOutlineHeartGlyph(ctx, iconCx, iconCy, 44);
  } else {
    drawOutlineBanGlyph(ctx, iconCx, iconCy, 40);
  }

  const textX = startX + 80;
  const textMaxWidth = HIGHLIGHT_WIDTH - 90;

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // Label em dourado caixa alta
  ctx.fillStyle = GOLD;
  ctx.font = font(700, 20);
  ctx.fillText(truncate(ctx, highlight.label.toUpperCase(), textMaxWidth), textX, top + 22);

  // Nome da faixa em branco
  ctx.fillStyle = WHITE;
  ctx.font = font(600, 32);
  ctx.fillText(truncate(ctx, highlight.name, textMaxWidth), textX, top + 58);

  // Linha divisória sutil
  ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
  ctx.fillRect(startX, top + HIGHLIGHT_ROW_HEIGHT - 6, HIGHLIGHT_WIDTH, 1);
}

/** Avatar circular com aro dourado. */
function drawAvatar(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  initial: string,
  cx: number,
  cy: number,
  radius: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (image) {
    ctx.drawImage(image, cx - radius, cy - radius, radius * 2, radius * 2);
  } else {
    ctx.fillStyle = PURPLE;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  }
  ctx.restore();

  if (!image) {
    ctx.fillStyle = WHITE;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = font(700, Math.round(radius * 0.74));
    ctx.fillText(initial, cx, cy);
  }

  // Aro dourado fino
  ctx.save();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Card de review com citação estilizada. */
function drawReviewCard(
  ctx: CanvasRenderingContext2D,
  data: ShareCardData,
  layout: ContentLayout,
  avatar: HTMLImageElement | null,
) {
  const top = layout.reviewCardTop;
  drawGlassCard(ctx, SIDE_PADDING, top, CONTENT_WIDTH, layout.reviewCardHeight, 28);

  // Borda dourada sutil no card
  ctx.save();
  roundedRectPath(ctx, SIDE_PADDING, top, CONTENT_WIDTH, layout.reviewCardHeight, 28);
  ctx.strokeStyle = "rgba(255, 186, 8, 0.25)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Aspas decorativas
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255, 186, 8, 0.2)";
  ctx.font = font(700, 130);
  ctx.fillText("”", SIDE_PADDING + CONTENT_WIDTH - 28, top + 116);

  const avatarRadius = REVIEW_HEADER_HEIGHT / 2 - 4;
  const avatarCx = SIDE_PADDING + REVIEW_PADDING + avatarRadius;
  const avatarCy = top + REVIEW_PADDING + avatarRadius;
  drawAvatar(
    ctx,
    avatar,
    data.userDisplayName.charAt(0).toUpperCase() || "?",
    avatarCx,
    avatarCy,
    avatarRadius,
  );

  const textX = avatarCx + avatarRadius + 24;
  const nameMaxWidth = CONTENT_WIDTH - (textX - SIDE_PADDING) - REVIEW_PADDING - 50;

  ctx.textAlign = "left";
  ctx.fillStyle = WHITE;
  ctx.font = font(700, 32);
  ctx.fillText(truncate(ctx, data.userDisplayName.toUpperCase(), nameMaxWidth), textX, avatarCy - 4);

  ctx.fillStyle = MUTED;
  ctx.font = font(500, 22);
  ctx.fillText(data.ratedAtLabel.toUpperCase(), textX, avatarCy + 26);

  ctx.fillStyle = "#e2e8f0";
  ctx.font = font(400, REVIEW_TEXT_SIZE);
  const firstBaseline = top + REVIEW_PADDING + REVIEW_HEADER_HEIGHT + REVIEW_HEADER_TO_TEXT + 24;
  layout.reviewLines.forEach((line, index) => {
    ctx.fillText(line, SIDE_PADDING + REVIEW_PADDING, firstBaseline + index * REVIEW_LINE_HEIGHT);
  });
}

/** Rodapé de identidade do modo sem review: avatar + nome + data centralizados como grupo. */
function drawIdentityRow(
  ctx: CanvasRenderingContext2D,
  data: ShareCardData,
  layout: ContentLayout,
  avatar: HTMLImageElement | null,
) {
  const usernameFont = font(700, 30);
  const dateFont = font(500, 22);
  const identityMaxWidth = TEXT_MAX_WIDTH - AVATAR_RADIUS * 2 - 24 - 80;

  ctx.font = usernameFont;
  const username = truncate(ctx, data.userDisplayName.toUpperCase(), identityMaxWidth);
  const usernameWidth = ctx.measureText(username).width;

  ctx.font = dateFont;
  const dateLabel = truncate(ctx, data.ratedAtLabel.toUpperCase(), identityMaxWidth);
  const dateWidth = ctx.measureText(dateLabel).width;

  const textBlockWidth = Math.max(usernameWidth, dateWidth);
  const gap = 24;
  const groupWidth = AVATAR_RADIUS * 2 + gap + textBlockWidth;
  const groupStartX = WIDTH / 2 - groupWidth / 2;
  const avatarCx = groupStartX + AVATAR_RADIUS;
  const textX = groupStartX + AVATAR_RADIUS * 2 + gap;

  drawAvatar(
    ctx,
    avatar,
    data.userDisplayName.charAt(0).toUpperCase() || "?",
    avatarCx,
    layout.identityCy,
    AVATAR_RADIUS,
  );

  ctx.textAlign = "left";
  ctx.fillStyle = WHITE;
  ctx.font = usernameFont;
  ctx.fillText(username, textX, layout.identityCy - 6);

  ctx.fillStyle = "#9ca3af";
  ctx.font = dateFont;
  ctx.fillText(dateLabel, textX, layout.identityCy + 24);
}

/**
 * Desenha o card compartilhável e devolve o PNG.
 */
export async function renderShareCard(data: ShareCardData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponível neste navegador.");

  await fontsReady();

  const [bgImage, logo, cover, avatar] = await Promise.all([
    loadImage(bgStoryUrl),
    loadImage(logoUrl),
    loadImage(`${env.VITE_API_URL}/albums/${data.albumId}/cover`),
    data.userAvatarUrl ? loadImage(data.userAvatarUrl) : Promise.resolve(null),
  ]);

  if (bgImage) {
    ctx.drawImage(bgImage, 0, 0, WIDTH, HEIGHT);
  } else {
    drawBrandBackground(ctx, cover, WIDTH, HEIGHT);
  }

  drawBrandLogo(ctx, logo, WIDTH / 2, LOGO_CY, LOGO_RADIUS);
  drawBrandFooter(ctx, WIDTH / 2, 0, FOOTER_LINE_Y);

  const layout = layoutContent(ctx, data);

  drawCover(ctx, cover, layout);
  drawScoreBadge(ctx, data, layout);

  // Nome do álbum em maiúsculas, negrito e destacado
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = WHITE;
  ctx.font = font(800, ALBUM_NAME_SIZE);
  layout.albumNameLines.forEach((line, index) => {
    ctx.fillText(
      truncate(ctx, line.toUpperCase(), TEXT_MAX_WIDTH),
      WIDTH / 2,
      layout.albumNameY + index * ALBUM_NAME_LINE_HEIGHT,
    );
  });

  // Linha do artista com divisores decorativos
  drawArtistRow(ctx, data.artist, layout.artistY, TEXT_MAX_WIDTH);

  // Destaques de faixa
  if (data.favoriteTrack) {
    drawHighlightRow(ctx, data.favoriteTrack, layout.favoriteCardTop, "favorite");
  }

  if (data.worstTrack) {
    drawHighlightRow(ctx, data.worstTrack, layout.worstCardTop, "worst");
  }

  if (data.reviewText) drawReviewCard(ctx, data, layout, avatar);
  else drawIdentityRow(ctx, data, layout, avatar);

  return toPngBlob(canvas);
}


