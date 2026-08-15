import { env } from "@/app/env";
import logoUrl from "@/assets/logo.webp";

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
  /** Já formatada pelo chamador, ex: "14/14 músicas avaliadas" (ver `albumDetail.progress`). */
  tracksRatedLabel: string;
  /** Opcionais porque o usuário escolhe o que entra no card (ver `ShareCardOptionsSheet`). */
  favoriteTrack?: ShareCardTrackHighlight;
  worstTrack?: ShareCardTrackHighlight;
  reviewText?: string;
}

// Formato de story (9:16). Fundo, logo e rodapé de marca são 100% desenhados
// aqui — nada de asset raster: sem isso, qualquer ajuste de layout (ex: dado
// opcional ausente) deixava um vão morto no meio do card em vez de recentralizar.
const WIDTH = 1080;
const HEIGHT = 1920;
const SIDE_PADDING = 84;
const CONTENT_WIDTH = WIDTH - SIDE_PADDING * 2;
const TEXT_MAX_WIDTH = CONTENT_WIDTH;

// Paleta oficial da marca (track-by-track/src/index.css, bloco @theme).
const PURPLE_DARK = "#341e49"; // roxo-escuro
const PURPLE = "#5d1f89"; // roxo
const GOLD = "#ffba08"; // dourado
const WHITE = "#ffffff";
const MUTED = "#bcbcbc"; // cinza-claro
const INK = "#01080e"; // grafite
const HEART_RED = "#f87171"; // red-400, mesma cor do coração de faixa favorita na tela
const BAN_GRAY = "#9ca3af"; // gray-400, mesma cor do ícone de pior faixa na tela

const FONT_STACK = '"SF Pro Display", Inter, system-ui, sans-serif';
const font = (weight: number, size: number) => `${weight} ${size}px ${FONT_STACK}`;

const COVER_RADIUS = 28;

// Logo grande é a marca do story — abaixo do cabeçalho do Instagram
// (avatar/nome/X ocupam o topo), acima do conteúdo do usuário.
const LOGO_CY = 300;
const LOGO_RADIUS = 130;

// Rodapé numa linha só, acima da barra de resposta do Instagram, que come a
// base do story; abaixo de ~230px nada é confiável de ler.
const FOOTER_DIVIDER_Y = HEIGHT - 300;
const FOOTER_LINE_Y = HEIGHT - 232;

// Faixa vertical onde o conteúdo do usuário (capa → rodapé com avatar) pode
// ficar sem invadir o logo (topo) nem o rodapé de marca (base) — é dentro
// dela que o bloco é centralizado, ver `layoutContent`.
const CONTENT_TOP = LOGO_CY + LOGO_RADIUS + 46;
const CONTENT_BOTTOM = FOOTER_DIVIDER_Y - 34;

const AVATAR_RADIUS = 46;
const HIGHLIGHT_CARD_HEIGHT = 86;
const PROGRESS_PILL_HEIGHT = 54;

// Card de review: avatar + nome + estrelas + data no topo, texto abaixo.
const REVIEW_PADDING = 30;
const REVIEW_HEADER_HEIGHT = 84;
const REVIEW_HEADER_TO_TEXT = 30;
const REVIEW_LINE_HEIGHT = 36;
const REVIEW_CHROME = REVIEW_PADDING * 2 + REVIEW_HEADER_HEIGHT + REVIEW_HEADER_TO_TEXT + 28;
const REVIEW_MAX_LINES = 6;

/**
 * Capa encolhe conforme o card ganha blocos — story é altura fixa, então o
 * espaço da arte é o que sobra depois de review e destaques.
 */
function getCoverSize(data: ShareCardData): number {
  if (!data.reviewText) return 430;
  return data.favoriteTrack || data.worstTrack ? 330 : 400;
}

/** Mesma faixa de cor do badge de nota na tela (`getScoreColorClasses`), em hex — canvas não lê classe Tailwind. */
function getScoreColor(score: number, isComplete: boolean): string {
  if (!isComplete) return MUTED;
  if (score < 4) return "#f87171"; // red-400
  if (score < 7) return "#facc15"; // yellow-400
  return "#4ade80"; // green-400
}

/**
 * Capa do álbum e avatar são buscados pelo **nosso** domínio (proxy da API):
 * imagem de outra origem sem CORS contamina o canvas e `toBlob` passa a
 * estourar `SecurityError`. `crossOrigin` continua obrigatório mesmo com o
 * proxy — sem ele o browser não pede CORS e o canvas é contaminado do mesmo jeito.
 */
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

/**
 * Quebra o texto da review em linhas. A última linha ganha reticências quando
 * sobrou texto — review longa não pode empurrar o rodapé de marca pra fora.
 */
function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }

  if (lines.length < maxLines && current) lines.push(current);

  const consumed = lines.join(" ").split(/\s+/).filter(Boolean).length;
  const lastIndex = lines.length - 1;
  const lastLine = lines[lastIndex];
  if (consumed < words.length && lastLine !== undefined) {
    lines[lastIndex] = truncate(ctx, `${lastLine} …`, maxWidth);
  }

  return lines;
}

/**
 * Path de retângulo arredondado montado só com `arc` — `roundRect` ainda não
 * existe em Safari antigo, e o card precisa sair igual em qualquer browser.
 */
function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arc(x + width - r, y + r, r, -Math.PI / 2, 0);
  ctx.lineTo(x + width, y + height - r);
  ctx.arc(x + width - r, y + height - r, r, 0, Math.PI / 2);
  ctx.lineTo(x + r, y + height);
  ctx.arc(x + r, y + height - r, r, Math.PI / 2, Math.PI);
  ctx.lineTo(x, y + r);
  ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  ctx.closePath();
}

/** Cartão de vidro: mesmo material do app (branco translúcido + borda 1px). */
function drawGlassCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function clearShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

/**
 * A própria capa vira a atmosfera do story: desfocada e ampliada atrás do
 * conteúdo, cada card sai com a cor do álbum em vez de um fundo genérico.
 * `ctx.filter` não existe em Safari antigo — sem ele a capa entra só como
 * mancha de cor bem apagada, e os gradientes da marca seguram o resto.
 */
function drawCoverAtmosphere(ctx: CanvasRenderingContext2D, cover: HTMLImageElement | null) {
  if (!cover) return;

  const supportsBlur = typeof ctx.filter === "string";
  ctx.save();
  if (supportsBlur) ctx.filter = "blur(90px)";
  ctx.globalAlpha = supportsBlur ? 0.75 : 0.3;

  const scale = Math.max(WIDTH / cover.width, HEIGHT / cover.height) * 1.25;
  const width = cover.width * scale;
  const height = cover.height * scale;
  ctx.drawImage(cover, (WIDTH - width) / 2, (HEIGHT - height) / 2, width, height);

  ctx.restore();
  ctx.globalAlpha = 1;
  if (supportsBlur) ctx.filter = "none";
}

/** Fundo roxo/dourado da marca: gradientes são sempre lisos, ao contrário do grão de um PNG. */
function drawBrandBackground(ctx: CanvasRenderingContext2D, cover: HTMLImageElement | null) {
  ctx.fillStyle = PURPLE_DARK;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawCoverAtmosphere(ctx, cover);

  // Véu roxo por cima da capa desfocada: sem ele, capa clara joga o contraste
  // do texto branco pro chão e o card deixa de ser reconhecível como do app.
  ctx.fillStyle = "rgba(52, 30, 73, 0.72)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const depth = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  depth.addColorStop(0, "rgba(1, 8, 14, 0.72)");
  depth.addColorStop(0.42, "rgba(1, 8, 14, 0.12)");
  depth.addColorStop(1, "rgba(1, 8, 14, 0.86)");
  ctx.fillStyle = depth;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Brilho roxo atrás da capa — dá volume ao centro sem competir com a arte.
  const center = ctx.createRadialGradient(WIDTH / 2, HEIGHT * 0.44, 0, WIDTH / 2, HEIGHT * 0.44, 700);
  center.addColorStop(0, "rgba(93, 31, 137, 0.55)");
  center.addColorStop(1, "rgba(93, 31, 137, 0)");
  ctx.fillStyle = center;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (const edgeX of [-140, WIDTH + 140]) {
    const glow = ctx.createRadialGradient(edgeX, HEIGHT / 2, 0, edgeX, HEIGHT / 2, 820);
    glow.addColorStop(0, "rgba(255, 186, 8, 0.26)");
    glow.addColorStop(1, "rgba(255, 186, 8, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}

/**
 * Logo real do app (círculo com fundo branco recortado por um clip circular —
 * `logo.webp` é um quadrado com o selo inscrito tangente às bordas, então o
 * clip no mesmo diâmetro remove os cantos brancos sem sobrar borda).
 */
function drawBrandLogo(ctx: CanvasRenderingContext2D, image: HTMLImageElement | null) {
  const cx = WIDTH / 2;
  const cy = LOGO_CY;

  if (!image) {
    ctx.fillStyle = WHITE;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = font(700, 34);
    ctx.fillText("TRACK BY TRACK", cx, cy);
    return;
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, LOGO_RADIUS, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(image, cx - LOGO_RADIUS, cy - LOGO_RADIUS, LOGO_RADIUS * 2, LOGO_RADIUS * 2);
  ctx.restore();
}

function drawInstagramGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, size, size);
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size * 0.28, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(x + size * 0.78, y + size * 0.22, 1.8, 0, Math.PI * 2);
  ctx.fill();
}

function drawGlobeGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const r = size / 2;
  const cx = x + r;
  const cy = y + r;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, cy);
  ctx.lineTo(x + size, cy);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.45, r, 0, 0, Math.PI * 2);
  ctx.stroke();
}

/** Coração de faixa favorita: mesmos dois lóbulos + ponta do ícone da tela. */
function drawHeartGlyph(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const r = size / 4;
  const top = cy - size / 4;
  ctx.fillStyle = HEART_RED;
  ctx.beginPath();
  ctx.arc(cx - r, top, r, Math.PI, 0);
  ctx.arc(cx + r, top, r, Math.PI, 0);
  ctx.lineTo(cx + r * 2, top + r * 0.4);
  ctx.lineTo(cx, cy + size / 2);
  ctx.lineTo(cx - r * 2, top + r * 0.4);
  ctx.closePath();
  ctx.fill();
}

/** Ícone de pior faixa: o mesmo "proibido" (Ban) usado no seletor da tela. */
function drawBanGlyph(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const r = size / 2;
  ctx.strokeStyle = BAN_GRAY;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  const offset = r * Math.SQRT1_2;
  ctx.beginPath();
  ctx.moveTo(cx - offset, cy - offset);
  ctx.lineTo(cx + offset, cy + offset);
  ctx.stroke();
}

function drawStarGlyph(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outer: number,
  filled: boolean,
) {
  const inner = outer * 0.44;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = GOLD;
    ctx.fill();
  } else {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

/** Nota 0-10 vira as 5 estrelas que o app mostra (`StarRating`). */
function drawStars(ctx: CanvasRenderingContext2D, startX: number, cy: number, score: number) {
  const filledCount = Math.round(score / 2);
  const size = 13;
  const gap = 10;
  for (let i = 0; i < 5; i += 1) {
    drawStarGlyph(ctx, startX + size + i * (size * 2 + gap), cy, size, i < filledCount);
  }
}

/** "@trackbytrackapp" / "www.trackbytrack.app": é a divulgação do app dentro do story. */
function drawBrandFooter(ctx: CanvasRenderingContext2D) {
  const cx = WIDTH / 2;

  // Linha única que some nas pontas — traço reto cortado a seco deixava duas
  // bordas duras no meio do card.
  const dividerWidth = 560;
  const divider = ctx.createLinearGradient(cx - dividerWidth / 2, 0, cx + dividerWidth / 2, 0);
  divider.addColorStop(0, "rgba(255, 186, 8, 0)");
  divider.addColorStop(0.5, "rgba(255, 186, 8, 0.55)");
  divider.addColorStop(1, "rgba(255, 186, 8, 0)");
  ctx.fillStyle = divider;
  ctx.fillRect(cx - dividerWidth / 2, FOOTER_DIVIDER_Y, dividerWidth, 2);

  ctx.textBaseline = "alphabetic";

  // Handle e site na mesma linha, medidos e centralizados como um grupo: com
  // offset fixo, texto de outro tamanho (outro handle, outro domínio) sai torto.
  const glyphSize = 22;
  const glyphGap = 12;
  const itemGap = 34;
  const handle = "@trackbytrackapp";
  const site = "www.trackbytrack.app";

  ctx.font = font(400, 24);
  const handleWidth = ctx.measureText(handle).width;
  const siteWidth = ctx.measureText(site).width;
  const totalWidth =
    glyphSize + glyphGap + handleWidth + itemGap + glyphSize + glyphGap + siteWidth;

  let x = cx - totalWidth / 2;
  ctx.textAlign = "left";

  drawInstagramGlyph(ctx, x, FOOTER_LINE_Y - 18, glyphSize);
  x += glyphSize + glyphGap;
  ctx.fillStyle = WHITE;
  ctx.font = font(400, 24);
  ctx.fillText(handle, x, FOOTER_LINE_Y);
  x += handleWidth + itemGap / 2;

  ctx.fillStyle = "rgba(255, 186, 8, 0.7)";
  ctx.textAlign = "center";
  ctx.fillText("·", x, FOOTER_LINE_Y);
  x += itemGap / 2;

  ctx.textAlign = "left";
  drawGlobeGlyph(ctx, x, FOOTER_LINE_Y - 18, glyphSize);
  x += glyphSize + glyphGap;
  ctx.fillStyle = WHITE;
  ctx.fillText(site, x, FOOTER_LINE_Y);
}

interface ContentLayout {
  coverSize: number;
  coverX: number;
  badgeRadius: number;
  coverY: number;
  albumNameY: number;
  artistY: number;
  /** Só no modo sem review — com review, o progresso entra na linha do artista. */
  progressPillTop: number;
  favoriteCardTop: number;
  worstCardTop: number;
  reviewCardTop: number;
  reviewLines: string[];
  reviewCardHeight: number;
  /** Só no modo sem review — com review, avatar/nome/data ficam dentro do card. */
  identityCy: number;
}

/**
 * Empilha capa → nome → artista → progresso → destaques → review/identidade a
 * partir de um cursor e centraliza o bloco na faixa livre entre logo e rodapé
 * de marca. Sem isso, card sem faixa favorita/pior sobrava um vão morto no
 * meio em vez de recentralizar.
 *
 * Precisa do contexto porque a altura do card de review depende de quantas
 * linhas o texto ocupa — e quantas linhas cabem depende do resto do bloco.
 */
function layoutContent(ctx: CanvasRenderingContext2D, data: ShareCardData): ContentLayout {
  const coverSize = getCoverSize(data);
  const badgeRadius = Math.round(coverSize * 0.17);
  const coverToName = coverSize + (badgeRadius - 16) + 40;
  const available = CONTENT_BOTTOM - CONTENT_TOP;
  const hasReview = Boolean(data.reviewText);

  let cursor = 0;
  const coverY = cursor;
  cursor += coverToName;
  const albumNameY = cursor;
  cursor += 58;
  const artistY = cursor;

  let progressPillTop = 0;
  if (!hasReview) {
    cursor += 44;
    progressPillTop = cursor;
    cursor += PROGRESS_PILL_HEIGHT;
  }

  let favoriteCardTop = 0;
  if (data.favoriteTrack) {
    cursor += hasReview ? 48 : 34;
    favoriteCardTop = cursor;
    cursor += HIGHLIGHT_CARD_HEIGHT;
  }

  let worstCardTop = 0;
  if (data.worstTrack) {
    cursor += data.favoriteTrack ? 14 : hasReview ? 48 : 34;
    worstCardTop = cursor;
    cursor += HIGHLIGHT_CARD_HEIGHT;
  }

  let reviewCardTop = 0;
  let reviewLines: string[] = [];
  let reviewCardHeight = 0;
  let identityCy = 0;

  if (data.reviewText) {
    reviewCardTop = cursor + (data.favoriteTrack || data.worstTrack ? 34 : 48);
    ctx.font = font(400, 26);
    const maxLines = Math.max(
      1,
      Math.min(
        REVIEW_MAX_LINES,
        Math.floor((available - reviewCardTop - REVIEW_CHROME) / REVIEW_LINE_HEIGHT),
      ),
    );
    reviewLines = wrapLines(ctx, data.reviewText, CONTENT_WIDTH - REVIEW_PADDING * 2, maxLines);
    reviewCardHeight = REVIEW_CHROME + reviewLines.length * REVIEW_LINE_HEIGHT;
    cursor = reviewCardTop + reviewCardHeight;
  } else {
    cursor += 60 + AVATAR_RADIUS;
    identityCy = cursor;
    cursor += AVATAR_RADIUS;
  }

  const offset = CONTENT_TOP + Math.max(0, (available - cursor) / 2);

  return {
    coverSize,
    coverX: (WIDTH - coverSize) / 2,
    badgeRadius,
    coverY: coverY + offset,
    albumNameY: albumNameY + offset,
    artistY: artistY + offset,
    progressPillTop: progressPillTop + offset,
    favoriteCardTop: favoriteCardTop + offset,
    worstCardTop: worstCardTop + offset,
    reviewCardTop: reviewCardTop + offset,
    reviewLines,
    reviewCardHeight,
    identityCy: identityCy + offset,
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
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 3, 0, Math.PI * 2);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = color;
  ctx.font = font(700, Math.round(radius * 0.78));
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
  drawGlassCard(ctx, SIDE_PADDING, top, CONTENT_WIDTH, HIGHLIGHT_CARD_HEIGHT, 24);

  const glyphCx = SIDE_PADDING + 58;
  ctx.fillStyle = variant === "favorite" ? "rgba(248, 113, 113, 0.14)" : "rgba(255, 255, 255, 0.08)";
  ctx.beginPath();
  ctx.arc(glyphCx, cy, 28, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();

  if (variant === "favorite") drawHeartGlyph(ctx, glyphCx, cy, 30);
  else drawBanGlyph(ctx, glyphCx, cy, 28);

  const textX = SIDE_PADDING + 106;
  const textMaxWidth = CONTENT_WIDTH - 106 - 36;

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = variant === "favorite" ? HEART_RED : BAN_GRAY;
  ctx.font = font(600, 22);
  ctx.fillText(truncate(ctx, highlight.label, textMaxWidth), textX, cy - 12);

  ctx.fillStyle = WHITE;
  ctx.font = font(700, 32);
  ctx.fillText(truncate(ctx, highlight.name, textMaxWidth), textX, cy + 26);
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
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * Card da review: avatar + nome + estrelas + data no topo, texto abaixo. Só
 * existe quando há texto — sem review o rodapé continua sendo a linha de
 * identidade solta, que ocupa bem menos altura.
 */
function drawReviewCard(
  ctx: CanvasRenderingContext2D,
  data: ShareCardData,
  layout: ContentLayout,
  avatar: HTMLImageElement | null,
) {
  const top = layout.reviewCardTop;
  drawGlassCard(ctx, SIDE_PADDING, top, CONTENT_WIDTH, layout.reviewCardHeight, 28);

  // Aspas decorativas no canto: marcam o bloco como citação sem gastar linha.
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.font = font(700, 130);
  ctx.fillText("”", SIDE_PADDING + CONTENT_WIDTH - 30, top + 118);

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

  const textX = avatarCx + avatarRadius + 26;

  ctx.textAlign = "left";
  ctx.fillStyle = WHITE;
  ctx.font = font(700, 32);
  ctx.fillText(
    truncate(ctx, data.userDisplayName, CONTENT_WIDTH - (textX - SIDE_PADDING) - REVIEW_PADDING),
    textX,
    top + REVIEW_PADDING + 26,
  );

  drawStars(ctx, textX, top + REVIEW_PADDING + 48, data.averageScore);

  ctx.fillStyle = MUTED;
  ctx.font = font(400, 22);
  ctx.fillText(data.ratedAtLabel, textX, top + REVIEW_PADDING + 82);

  ctx.fillStyle = "#d8d8d8";
  ctx.font = font(400, 26);
  const firstBaseline = top + REVIEW_PADDING + REVIEW_HEADER_HEIGHT + REVIEW_HEADER_TO_TEXT + 26;
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
  const usernameFont = font(700, 32);
  const dateFont = font(400, 24);
  const identityMaxWidth = TEXT_MAX_WIDTH - AVATAR_RADIUS * 2 - 24 - 120;

  ctx.font = usernameFont;
  const username = truncate(ctx, data.userDisplayName, identityMaxWidth);
  const usernameWidth = ctx.measureText(username).width;

  ctx.font = dateFont;
  const dateLabel = truncate(ctx, data.ratedAtLabel, identityMaxWidth);
  const dateWidth = ctx.measureText(dateLabel).width;

  const textBlockWidth = Math.max(usernameWidth, dateWidth);
  const gap = 22;
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
  ctx.fillText(username, textX, layout.identityCy - 4);

  ctx.fillStyle = MUTED;
  ctx.font = dateFont;
  ctx.fillText(dateLabel, textX, layout.identityCy + 30);
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

  drawBrandBackground(ctx, cover);
  drawBrandLogo(ctx, logo);
  drawBrandFooter(ctx);

  const layout = layoutContent(ctx, data);

  drawCover(ctx, cover, layout);
  drawScoreBadge(ctx, data, layout);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = WHITE;
  ctx.font = font(700, 52);
  ctx.fillText(truncate(ctx, data.albumName, TEXT_MAX_WIDTH), WIDTH / 2, layout.albumNameY);

  ctx.fillStyle = MUTED;
  ctx.font = font(400, 34);
  // Com review, o card embaixo já é alto: o progresso vira sufixo do artista
  // em vez de mais um bloco na pilha.
  const artistLine = data.reviewText
    ? `${data.artist} · ${data.tracksRatedLabel}`
    : data.artist;
  ctx.fillText(truncate(ctx, artistLine, TEXT_MAX_WIDTH), WIDTH / 2, layout.artistY);

  if (!data.reviewText) {
    ctx.font = font(500, 26);
    const progressText = truncate(ctx, data.tracksRatedLabel, TEXT_MAX_WIDTH - 72);
    const progressWidth = ctx.measureText(progressText).width + 72;
    drawGlassCard(
      ctx,
      WIDTH / 2 - progressWidth / 2,
      layout.progressPillTop,
      progressWidth,
      PROGRESS_PILL_HEIGHT,
      PROGRESS_PILL_HEIGHT / 2,
    );
    ctx.textAlign = "center";
    ctx.fillStyle = MUTED;
    ctx.font = font(500, 26);
    ctx.fillText(progressText, WIDTH / 2, layout.progressPillTop + 36);
  }

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
