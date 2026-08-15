import { env } from "@/app/env";
import logoUrl from "@/assets/logo.webp";
import {
  BAN_GRAY,
  HEART_RED,
  INK,
  MUTED,
  PURPLE,
  WHITE,
  clearShadow,
  drawBanGlyph,
  drawBrandBackground,
  drawBrandFooter,
  drawBrandLogo,
  drawGlassCard,
  drawHeartGlyph,
  font,
  loadImage,
  roundedRectPath,
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

// Formato de story (9:16). Fundo, logo e rodapé de marca vêm de canvas-kit —
// só o layout do conteúdo do usuário (capa, review, destaques) é deste módulo.
const WIDTH = 1080;
const HEIGHT = 1920;
const SIDE_PADDING = 84;
const CONTENT_WIDTH = WIDTH - SIDE_PADDING * 2;
const TEXT_MAX_WIDTH = CONTENT_WIDTH;

const COVER_RADIUS = 32;

// Logo grande é a marca do story — abaixo do cabeçalho do Instagram
// (avatar/nome/X ocupam o topo), acima do conteúdo do usuário.
const LOGO_CY = 230;
const LOGO_RADIUS = 130;

// Rodapé acima da barra de resposta do Instagram, que come a base do story;
// abaixo de ~230px nada é confiável de ler.
const FOOTER_DIVIDER_Y = HEIGHT - 306;
const FOOTER_LINE_Y = HEIGHT - 230;

// Faixa vertical onde o conteúdo do usuário (capa → review/identidade) pode
// ficar sem invadir o logo (topo) nem o rodapé de marca (base) — é dentro
// dela que o bloco é centralizado, ver `layoutContent`.
const CONTENT_TOP = LOGO_CY + LOGO_RADIUS + 44;
const CONTENT_BOTTOM = FOOTER_DIVIDER_Y - 36;
const AVAILABLE_HEIGHT = CONTENT_BOTTOM - CONTENT_TOP;

// Capa é o que cede espaço quando o card ganha blocos: o layout tenta o maior
// tamanho desta lista que ainda deixa tudo caber (ver `layoutContent`).
const COVER_SIZES = [560, 520, 480, 440, 400, 360, 320, 280];

const ALBUM_NAME_SIZE = 60;
const ALBUM_NAME_LINE_HEIGHT = 68;
const ALBUM_NAME_MAX_LINES = 3;

const AVATAR_RADIUS = 54;
const HIGHLIGHT_CARD_HEIGHT = 104;

// Card de review: avatar + nome + data no topo, texto abaixo.
const REVIEW_PADDING = 34;
const REVIEW_HEADER_HEIGHT = 96;
const REVIEW_HEADER_TO_TEXT = 32;
const REVIEW_LINE_HEIGHT = 42;
const REVIEW_TEXT_SIZE = 30;
const REVIEW_CHROME = REVIEW_PADDING * 2 + REVIEW_HEADER_HEIGHT + REVIEW_HEADER_TO_TEXT + 28;
const REVIEW_MAX_LINES = 6;

/** Mesma faixa de cor do badge de nota na tela (`getScoreColorClasses`), em hex — canvas não lê classe Tailwind. */
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
  /** Só no modo sem review — com review, avatar/nome/data ficam dentro do card. */
  identityCy: number;
  height: number;
}

/**
 * Empilha capa → nome → artista → destaques → review/identidade a partir de um
 * cursor e centraliza o bloco na faixa livre entre logo e rodapé de marca.
 * Sem isso, card sem faixa favorita/pior sobrava um vão morto no meio.
 *
 * Precisa do contexto porque nome do álbum e review quebram em N linhas, e a
 * altura de tudo depende disso.
 */
function measureLayout(
  ctx: CanvasRenderingContext2D,
  data: ShareCardData,
  coverSize: number,
  albumNameLines: string[],
  neededReviewLines: number,
): ContentLayout {
  const badgeRadius = Math.round(coverSize * 0.17);

  let cursor = 0;
  const coverY = cursor;
  // Selo de nota passa da base da capa: a folga garante que o nome nunca
  // encoste nele, independente do tamanho escolhido pra capa.
  cursor += coverSize + (badgeRadius - 16) + 46;
  const albumNameY = cursor;
  cursor += (albumNameLines.length - 1) * ALBUM_NAME_LINE_HEIGHT + 58;
  const artistY = cursor;

  let favoriteCardTop = 0;
  if (data.favoriteTrack) {
    cursor += 48;
    favoriteCardTop = cursor;
    cursor += HIGHLIGHT_CARD_HEIGHT;
  }

  let worstCardTop = 0;
  if (data.worstTrack) {
    cursor += data.favoriteTrack ? 16 : 48;
    worstCardTop = cursor;
    cursor += HIGHLIGHT_CARD_HEIGHT;
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
    cursor += 74 + AVATAR_RADIUS;
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
 * Escolhe a MAIOR capa que ainda deixa o bloco inteiro caber, e só então
 * centraliza. Tamanho fixo obrigava a encolher tudo pelo pior caso (nome em 3
 * linhas + review longa + dois destaques), deixando o card pequeno à toa
 * quando o ranking tinha pouca coisa.
 */
function layoutContent(ctx: CanvasRenderingContext2D, data: ShareCardData): ContentLayout {
  ctx.font = font(700, ALBUM_NAME_SIZE);
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

  // Bias pra baixo em vez de centro puro: sobra fica mais no topo (perto da
  // logo) que no rodapé (perto do bloco do usuário) — pedido explícito de
  // "descer a parte do usuário" em vez de deixar vão morto embaixo.
  const offset = CONTENT_TOP + Math.max(0, (AVAILABLE_HEIGHT - chosen.height) * 0.8);

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

/** Capa com cantos arredondados + sombra: é o que separa a arte do fundo desfocado dela mesma. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  cover: HTMLImageElement | null,
  layout: ContentLayout,
) {
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
    // Fallback: sem capa o card continua legível, só perde a arte.
    roundedRectPath(ctx, coverX, coverY, coverSize, coverSize, COVER_RADIUS);
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fill();
  }

  roundedRectPath(ctx, coverX, coverY, coverSize, coverSize, COVER_RADIUS);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** Selo da nota encostado no canto da capa — é o dado que o story existe pra mostrar. */
function drawScoreBadge(ctx: CanvasRenderingContext2D, data: ShareCardData, layout: ContentLayout) {
  const radius = layout.badgeRadius;
  const cx = layout.coverX + layout.coverSize - radius * 0.65;
  const cy = layout.coverY + layout.coverSize - 16;
  const color = getScoreColor(data.averageScore, data.isScoreComplete);

  ctx.save();
  ctx.shadowColor = "rgba(1, 8, 14, 0.7)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = "rgba(6, 4, 12, 0.92)";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  clearShadow(ctx);

  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 4, 0, Math.PI * 2);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = color;
  ctx.font = font(700, Math.round(radius * 0.8));
  ctx.fillText(data.averageScore.toFixed(1), cx, cy + radius * 0.08);

  ctx.fillStyle = MUTED;
  ctx.font = font(600, Math.round(radius * 0.28));
  ctx.fillText("/10", cx, cy + radius * 0.56);
}

/** Destaque (faixa favorita / pior faixa) em cartão de vidro com o ícone da tela. */
function drawHighlightCard(
  ctx: CanvasRenderingContext2D,
  highlight: ShareCardTrackHighlight,
  top: number,
  variant: "favorite" | "worst",
) {
  const cy = top + HIGHLIGHT_CARD_HEIGHT / 2;
  drawGlassCard(ctx, SIDE_PADDING, top, CONTENT_WIDTH, HIGHLIGHT_CARD_HEIGHT, 26);

  const glyphCx = SIDE_PADDING + 64;
  ctx.fillStyle = variant === "favorite" ? "rgba(248, 113, 113, 0.14)" : "rgba(255, 255, 255, 0.08)";
  ctx.beginPath();
  ctx.arc(glyphCx, cy, 33, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();

  if (variant === "favorite") drawHeartGlyph(ctx, glyphCx, cy, 36);
  else drawBanGlyph(ctx, glyphCx, cy, 34);

  const textX = SIDE_PADDING + 118;
  const textMaxWidth = CONTENT_WIDTH - 118 - 36;

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = variant === "favorite" ? HEART_RED : BAN_GRAY;
  ctx.font = font(600, 26);
  ctx.fillText(truncate(ctx, highlight.label, textMaxWidth), textX, cy - 14);

  ctx.fillStyle = WHITE;
  ctx.font = font(700, 38);
  ctx.fillText(truncate(ctx, highlight.name, textMaxWidth), textX, cy + 30);
}

/** Avatar circular (usado solto no rodapé de identidade e dentro do card de review). */
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
    ctx.textBaseline = "alphabetic";
    ctx.font = font(700, Math.round(radius * 0.74));
    ctx.fillText(initial, cx, cy + radius * 0.26);
  }

  ctx.strokeStyle = "rgba(255, 186, 8, 0.55)";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 5, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * Card da review: avatar + nome + data no topo, texto abaixo. Só existe quando
 * há texto — sem review o rodapé continua sendo a linha de identidade solta,
 * que ocupa bem menos altura.
 */
function drawReviewCard(
  ctx: CanvasRenderingContext2D,
  data: ShareCardData,
  layout: ContentLayout,
  avatar: HTMLImageElement | null,
) {
  const top = layout.reviewCardTop;
  drawGlassCard(ctx, SIDE_PADDING, top, CONTENT_WIDTH, layout.reviewCardHeight, 30);

  // Aspas decorativas no canto: marcam o bloco como citação sem gastar linha.
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.font = font(700, 140);
  ctx.fillText("”", SIDE_PADDING + CONTENT_WIDTH - 32, top + 126);

  const avatarRadius = REVIEW_HEADER_HEIGHT / 2;
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

  const textX = avatarCx + avatarRadius + 28;
  const nameMaxWidth = CONTENT_WIDTH - (textX - SIDE_PADDING) - REVIEW_PADDING - 60;

  ctx.textAlign = "left";
  ctx.fillStyle = WHITE;
  ctx.font = font(700, 38);
  ctx.fillText(truncate(ctx, data.userDisplayName, nameMaxWidth), textX, avatarCy - 4);

  ctx.fillStyle = MUTED;
  ctx.font = font(400, 27);
  ctx.fillText(data.ratedAtLabel, textX, avatarCy + 34);

  ctx.fillStyle = "#dcdcdc";
  ctx.font = font(400, REVIEW_TEXT_SIZE);
  const firstBaseline = top + REVIEW_PADDING + REVIEW_HEADER_HEIGHT + REVIEW_HEADER_TO_TEXT + 28;
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
  const usernameFont = font(700, 38);
  const dateFont = font(400, 28);
  const identityMaxWidth = TEXT_MAX_WIDTH - AVATAR_RADIUS * 2 - 26 - 120;

  ctx.font = usernameFont;
  const username = truncate(ctx, data.userDisplayName, identityMaxWidth);
  const usernameWidth = ctx.measureText(username).width;

  ctx.font = dateFont;
  const dateLabel = truncate(ctx, data.ratedAtLabel, identityMaxWidth);
  const dateWidth = ctx.measureText(dateLabel).width;

  const textBlockWidth = Math.max(usernameWidth, dateWidth);
  const gap = 26;
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

  ctx.fillStyle = MUTED;
  ctx.font = dateFont;
  ctx.fillText(dateLabel, textX, layout.identityCy + 34);
}

/**
 * Desenha o card compartilhável e devolve o PNG. Função pura de desenho — sem
 * React e sem hook, então dá pra testar passando um canvas mock.
 *
 * Nada aqui pode estourar por falta de dado: álbum sem capa, usuário sem foto
 * e ranking sem review/faixa favorita/pior são casos normais, não erro.
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

  const [logo, cover, avatar] = await Promise.all([
    loadImage(logoUrl),
    loadImage(`${env.VITE_API_URL}/albums/${data.albumId}/cover`),
    data.userAvatarUrl ? loadImage(data.userAvatarUrl) : Promise.resolve(null),
  ]);

  drawBrandBackground(ctx, cover, WIDTH, HEIGHT);
  drawBrandLogo(ctx, logo, WIDTH / 2, LOGO_CY, LOGO_RADIUS);
  drawBrandFooter(ctx, WIDTH / 2, FOOTER_DIVIDER_Y, FOOTER_LINE_Y);

  const layout = layoutContent(ctx, data);

  drawCover(ctx, cover, layout);
  drawScoreBadge(ctx, data, layout);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Nome do álbum quebra linha em vez de truncar: cortar o nome do álbum é
  // justamente o dado que o story existe pra mostrar.
  ctx.fillStyle = WHITE;
  ctx.font = font(700, ALBUM_NAME_SIZE);
  layout.albumNameLines.forEach((line, index) => {
    ctx.fillText(
      truncate(ctx, line, TEXT_MAX_WIDTH),
      WIDTH / 2,
      layout.albumNameY + index * ALBUM_NAME_LINE_HEIGHT,
    );
  });

  ctx.fillStyle = MUTED;
  ctx.font = font(400, 38);
  ctx.fillText(truncate(ctx, data.artist, TEXT_MAX_WIDTH), WIDTH / 2, layout.artistY);

  if (data.favoriteTrack) {
    drawHighlightCard(ctx, data.favoriteTrack, layout.favoriteCardTop, "favorite");
  }

  if (data.worstTrack) {
    drawHighlightCard(ctx, data.worstTrack, layout.worstCardTop, "worst");
  }

  if (data.reviewText) drawReviewCard(ctx, data, layout, avatar);
  else drawIdentityRow(ctx, data, layout, avatar);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Não foi possível gerar a imagem."));
    }, "image/png");
  });
}
